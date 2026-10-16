using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.WillQuiz;
using API_CPX.Context;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Service.WillQuiz
{
    public class WillQuizPublishService
    {
        private const string PublishCode = "PUBLISH-WILL-QUIZ";
        private const string ListCode = "GET-WILL-QUIZ-PUBLICATIONS";

        private static BusinessException Error(string message)
        {
            return new BusinessException(message, PublishCode);
        }

        private static bool HasText(string value)
        {
            return !string.IsNullOrWhiteSpace(value);
        }

        private static WillQuizPublicationResult MapPublication(tbl_WillQuiz_Publication entity)
        {
            return new WillQuizPublicationResult
            {
                RowID = entity.RowID,
                VersionNo = entity.VersionNo,
                Status = entity.Status,
                QuestionCount = entity.QuestionCount,
                MinimumCorrectAnswers = entity.MinimumCorrectAnswers,
                PublishedAt = entity.PublishedAt,
                PublishedBy = entity.PublishedBy
            };
        }

        // ============================================================
        // PUBLICATION LIST
        // ============================================================

        public async Task<List<WillQuizPublicationResult>> GetPublicationsAsync(string merchantId)
        {
            if (string.IsNullOrWhiteSpace(merchantId))
            {
                throw new BusinessException("Invalid merchant account.", ListCode);
            }

            using (var db = new Sandbox_BasedEntities())
            {
                bool merchantExists = await db.tbl_Merchant
                    .AsNoTracking()
                    .AnyAsync(x => x.MerchantID == merchantId && x.Status == 0);

                if (!merchantExists)
                {
                    throw new BusinessException("Invalid merchant account.", ListCode);
                }

                var publications =
                    await db.tbl_WillQuiz_Publication
                        .AsNoTracking()
                        .Where(x => x.MerchantID == merchantId)
                        .OrderByDescending(x => x.VersionNo)
                        .ToListAsync();

                return publications.Select(MapPublication).ToList();
            }
        }

        // ============================================================
        // PUBLISH QUIZ
        // ============================================================

        public async Task<WillQuizPublicationResult> PublishAsync(string merchantId, long userId)
        {
            if (string.IsNullOrWhiteSpace(merchantId))
                throw Error("Invalid merchant account.");

            if (userId <= 0)
                throw Error("Invalid authenticated user.");

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                // ----------------------------------------------------
                // 1. Validate merchant
                // ----------------------------------------------------

                bool merchantExists = await db.tbl_Merchant
                    .AsNoTracking()
                    .AnyAsync(x => x.MerchantID == merchantId && x.Status == 0);

                if (!merchantExists)
                    throw Error("Invalid merchant account.");

                // ----------------------------------------------------
                // 2. Validate configuration
                // ----------------------------------------------------

                var config = await db.tbl_Config_General
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId)
                    .Select(x => new
                    {
                        x.WillQuizMinCorrectAnswers
                    })
                    .FirstOrDefaultAsync();

                if (config == null)
                    throw Error("Will quiz configuration does not exist.");

                int minimumCorrect = config.WillQuizMinCorrectAnswers;

                if (minimumCorrect <= 0)
                    throw Error("Minimum correct answers must be greater than zero.");

                // ----------------------------------------------------
                // 3. Validate English and Chinese papers
                // ----------------------------------------------------

                var papers = await db.tbl_WillQuiz_Paper
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && x.Status == 1 && !x.IsDeleted)
                    .ToListAsync();

                if (papers.Count != 2 || papers.Count(x => x.LanguageCode == "EN") != 1 || papers.Count(x => x.LanguageCode == "ZH") != 1)
                {
                    throw Error("One active English paper and one active " + "Chinese paper are required.");
                }

                // ----------------------------------------------------
                // 4. Load active sections
                // ----------------------------------------------------

                var sections = await db.tbl_WillQuiz_Section
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && x.Status == 1 && !x.IsDeleted)
                    .ToListAsync();

                if (!sections.Any())
                    throw Error("No active quiz sections found.");

                var sectionIds = sections.Select(x => x.RowID).ToList();

                var sectionTexts =
                    await db.tbl_WillQuiz_SectionText
                        .AsNoTracking()
                        .Where(x => sectionIds.Contains(x.SectionID))
                        .ToListAsync();

                foreach (var section in sections)
                {
                    var texts = sectionTexts.Where(x => x.SectionID == section.RowID).ToList();
                    var en = texts.FirstOrDefault(x => x.LanguageCode == "EN");
                    var zh = texts.FirstOrDefault(x => x.LanguageCode == "ZH");

                    if (en == null || zh == null || !HasText(en.SectionName) || !HasText(zh.SectionName))
                    {
                        throw Error("Section " + section.SectionCode + " has incomplete translations.");
                    }
                }

                // ----------------------------------------------------
                // 5. Load active questions
                // ----------------------------------------------------

                var allActiveQuestions =
                    await db.tbl_WillQuiz_Question
                        .AsNoTracking()
                        .Where(x => x.MerchantID == merchantId && x.Status == 1 && !x.IsDeleted)
                        .ToListAsync();

                if (!allActiveQuestions.Any())
                    throw Error("No active quiz questions found.");

                // An active question must belong to an active section.
                if (allActiveQuestions.Any(q => !sectionIds.Contains(q.SectionID)))
                {
                    throw Error("An active question belongs to an " + "inactive or deleted section.");
                }

                var questions = allActiveQuestions
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.QuestionNo)
                    .ToList();

                int questionCount = questions.Count;

                if (minimumCorrect > questionCount)
                {
                    throw Error("Minimum correct answers (" + minimumCorrect + ") cannot exceed the active question count (" + questionCount + ").");
                }

                if (questions.GroupBy(x => x.QuestionNo).Any(x => x.Count() > 1))
                {
                    throw Error("Duplicate active question numbers found.");
                }

                // ----------------------------------------------------
                // 6. Load question translations
                // ----------------------------------------------------

                var questionIds = questions.Select(x => x.RowID).ToList();

                var questionTexts =
                    await db.tbl_WillQuiz_QuestionText
                        .AsNoTracking()
                        .Where(x => questionIds.Contains(x.QuestionID))
                        .ToListAsync();

                // ----------------------------------------------------
                // 7. Load options and translations
                // ----------------------------------------------------

                var options = await db.tbl_WillQuiz_AnswerOption
                    .AsNoTracking()
                    .Where(x => questionIds.Contains(x.QuestionID) && !x.IsDeleted)
                    .ToListAsync();

                var optionIds = options.Select(x => x.RowID).ToList();

                var optionTexts =
                    await db.tbl_WillQuiz_AnswerOptionText
                        .AsNoTracking()
                        .Where(x => optionIds.Contains(x.OptionID))
                        .ToListAsync();

                // ----------------------------------------------------
                // 8. Validate each question
                // ----------------------------------------------------

                foreach (var question in questions)
                {
                    if (question.QuestionNo <= 0)
                        throw Error("Invalid question number.");

                    if (question.AnswerType != "SINGLE" && question.AnswerType != "MULTIPLE")
                    {
                        throw Error("Invalid answer type for question " + question.QuestionNo + ".");
                    }

                    var texts = questionTexts.Where(x => x.QuestionID == question.RowID).ToList();
                    var en = texts.FirstOrDefault(x => x.LanguageCode == "EN");
                    var zh = texts.FirstOrDefault(x => x.LanguageCode == "ZH");

                    if (en == null || zh == null || !HasText(en.QuestionText) || !HasText(zh.QuestionText))
                    {
                        throw Error("Question " + question.QuestionNo + " has incomplete translations.");
                    }

                    var questionOptions = options.Where(x => x.QuestionID == question.RowID).ToList();

                    if (questionOptions.Count < 2)
                    {
                        throw Error("Question " + question.QuestionNo + " requires at least two active options.");
                    }

                    if (questionOptions.GroupBy(x => x.OptionCode, StringComparer.OrdinalIgnoreCase).Any(x => x.Count() > 1))
                    {
                        throw Error("Duplicate option codes for question " + question.QuestionNo + ".");
                    }

                    int correctCount = questionOptions.Count(x => x.IsCorrect);

                    if (question.AnswerType == "SINGLE" && correctCount != 1)
                    {
                        throw Error("SINGLE question " + question.QuestionNo + " must have exactly one correct option.");
                    }

                    if (question.AnswerType == "MULTIPLE" && correctCount < 2)
                    {
                        throw Error("MULTIPLE question " + question.QuestionNo + " must have at least two correct options.");
                    }

                    foreach (var option in questionOptions)
                    {
                        var translations = optionTexts.Where(x => x.OptionID == option.RowID).ToList();
                        var optionEn = translations.FirstOrDefault(x => x.LanguageCode == "EN");
                        var optionZh = translations.FirstOrDefault(x => x.LanguageCode == "ZH");

                        if (!HasText(option.OptionCode) ||
                            optionEn == null ||
                            optionZh == null ||
                            !HasText(optionEn.OptionText) ||
                            !HasText(optionZh.OptionText))
                        {
                            throw Error("Incomplete option translations for " + "question " + question.QuestionNo + ".");
                        }
                    }
                }

                // ----------------------------------------------------
                // 9. Determine next publication version
                //
                // This query is inside a SERIALIZABLE transaction.
                // Database unique indexes provide the final
                // protection against concurrent version conflicts.
                // ----------------------------------------------------

                var previousPublications = await db.tbl_WillQuiz_Publication.Where(x => x.MerchantID == merchantId).OrderByDescending(x => x.VersionNo).ToListAsync();

                int nextVersion = previousPublications.Any() ? checked(previousPublications[0].VersionNo + 1) : 1;

                // ----------------------------------------------------
                // 10. Archive previous active publication
                // ----------------------------------------------------

                foreach (var previous in previousPublications.Where(x => x.Status == "ACTIVE"))
                {
                    previous.Status = "ARCHIVED";
                }

                // Flush archive update before inserting a new ACTIVE
                // publication, due to the filtered unique index.
                await db.SaveChangesAsync();

                // ----------------------------------------------------
                // 11. Create publication
                // ----------------------------------------------------

                var publication = new tbl_WillQuiz_Publication
                {
                    MerchantID = merchantId,
                    VersionNo = nextVersion,
                    Status = "ACTIVE",
                    QuestionCount = questionCount,
                    MinimumCorrectAnswers = minimumCorrect,
                    PublishedAt = DateTime.UtcNow,
                    PublishedBy = userId
                };

                db.tbl_WillQuiz_Publication.Add(publication);

                await db.SaveChangesAsync();

                // ----------------------------------------------------
                // 12. Create immutable question/option snapshots
                // ----------------------------------------------------

                var sectionById = sections.ToDictionary(x => x.RowID);
                var questionTextLookup = questionTexts.ToLookup(x => x.QuestionID);
                var optionLookup = options.ToLookup(x => x.QuestionID);
                var optionTextLookup = optionTexts.ToLookup(x => x.OptionID);

                foreach (var question in questions)
                {
                    var texts = questionTextLookup[question.RowID];
                    var en = texts.First(x => x.LanguageCode == "EN");
                    var zh = texts.First(x => x.LanguageCode == "ZH");
                    var section = sectionById[question.SectionID];

                    var snapshotQuestion =
                        new tbl_WillQuiz_PublicationQuestion
                        {
                            PublicationID = publication.RowID,
                            SourceQuestionID = question.RowID,
                            SectionCode = section.SectionCode,
                            QuestionNo = question.QuestionNo,
                            AnswerType = question.AnswerType,
                            EnglishText = en.QuestionText,
                            ChineseText = zh.QuestionText,
                            Sort = question.Sort
                        };

                    db.tbl_WillQuiz_PublicationQuestion.Add(snapshotQuestion);

                    // Save to obtain snapshot question RowID.
                    await db.SaveChangesAsync();

                    foreach (var option in optionLookup[question.RowID].OrderBy(x => x.Sort).ThenBy(x => x.RowID))
                    {
                        var translations = optionTextLookup[option.RowID];
                        var optionEn = translations.First(x => x.LanguageCode == "EN");
                        var optionZh = translations.First(x => x.LanguageCode == "ZH");

                        var snapshotOption =
                            new tbl_WillQuiz_PublicationOption
                            {
                                PublicationQuestionID = snapshotQuestion.RowID,
                                SourceOptionID = option.RowID,
                                OptionCode = option.OptionCode,
                                EnglishText = optionEn.OptionText,
                                ChineseText = optionZh.OptionText,
                                IsCorrect = option.IsCorrect,
                                Sort = option.Sort
                            };

                        db.tbl_WillQuiz_PublicationOption.Add(snapshotOption);
                    }

                    await db.SaveChangesAsync();
                }

                // ----------------------------------------------------
                // 13. Commit entire publication atomically
                // ----------------------------------------------------

                tx.Commit();

                return MapPublication(publication);
            }
        }
    }
}