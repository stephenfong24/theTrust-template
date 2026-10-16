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
    public class WillQuizManagementService
    {
        private const string Code = "WILL-QUIZ-MANAGEMENT";

        private static BusinessException Error(string message)
        {
            return new BusinessException(message, Code);
        }

        private static string Clean(string value)
        {
            return (value ?? "").Trim();
        }

        private static void ValidateIdentity(string merchantId, long userId)
        {
            if (string.IsNullOrWhiteSpace(merchantId))
                throw Error("Invalid merchant account.");

            if (userId <= 0)
                throw Error("Invalid authenticated user.");
        }

        private static async Task ValidateMerchantAsync(Sandbox_BasedEntities db, string merchantId)
        {
            bool exists = await db.tbl_Merchant
                .AsNoTracking()
                .AnyAsync(x => x.MerchantID == merchantId && x.Status == 0);

            if (!exists)
                throw Error("Invalid merchant account.");
        }

        // ============================================================
        // PAPER VALIDATION
        // ============================================================

        private static void ValidatePaper(WillQuizPaperSaveRequest request)
        {
            if (request == null)
                throw Error("Invalid paper request.");

            request.PaperCode = Clean(request.PaperCode);
            request.PaperName = Clean(request.PaperName);
            request.LanguageCode = Clean(request.LanguageCode).ToUpperInvariant();

            if (request.PaperCode.Length == 0 || request.PaperCode.Length > 50)
                throw Error("Invalid paper code.");

            if (request.PaperName.Length == 0 || request.PaperName.Length > 200)
                throw Error("Invalid paper name.");

            if (request.LanguageCode != "EN" && request.LanguageCode != "ZH")
                throw Error("Language must be EN or ZH.");

            if (request.Sort < 0 || (request.Status != 0 && request.Status != 1))
                throw Error("Invalid paper sort or status.");
        }

        private static WillQuizPaperResult MapPaper(tbl_WillQuiz_Paper x)
        {
            return new WillQuizPaperResult
            {
                RowID = x.RowID,
                PaperCode = x.PaperCode,
                PaperName = x.PaperName,
                LanguageCode = x.LanguageCode,
                Sort = x.Sort,
                Status = x.Status,
                CreatedAt = x.CreatedAt,
                CreatedBy = x.CreatedBy,
                UpdatedAt = x.UpdatedAt,
                UpdatedBy = x.UpdatedBy
            };
        }

        public async Task<List<WillQuizPaperResult>> GetPapersAsync(string merchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var rows = await db.tbl_WillQuiz_Paper
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && !x.IsDeleted)
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.RowID)
                    .ToListAsync();

                return rows.Select(MapPaper).ToList();
            }
        }

        public async Task<WillQuizPaperResult> CreatePaperAsync(string merchantId, long userId, WillQuizPaperSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidatePaper(request);

            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                bool duplicate = await db.tbl_WillQuiz_Paper
                    .AnyAsync(x =>
                        x.MerchantID == merchantId &&
                        !x.IsDeleted &&
                        (x.PaperCode == request.PaperCode ||
                         x.LanguageCode == request.LanguageCode));

                if (duplicate)
                    throw Error("Paper code or language already exists.");

                var entity = new tbl_WillQuiz_Paper
                {
                    MerchantID = merchantId,
                    PaperCode = request.PaperCode,
                    PaperName = request.PaperName,
                    LanguageCode = request.LanguageCode,
                    Sort = request.Sort,
                    Status = request.Status,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId
                };

                db.tbl_WillQuiz_Paper.Add(entity);
                await db.SaveChangesAsync();

                return MapPaper(entity);
            }
        }

        public async Task<WillQuizPaperResult> UpdatePaperAsync(string merchantId, long userId, long id, WillQuizPaperSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidatePaper(request);

            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var entity = await db.tbl_WillQuiz_Paper
                    .FirstOrDefaultAsync(x =>
                        x.RowID == id &&
                        x.MerchantID == merchantId &&
                        !x.IsDeleted);

                if (entity == null)
                    throw Error("Paper not found.");

                bool duplicate = await db.tbl_WillQuiz_Paper
                    .AnyAsync(x =>
                        x.RowID != id &&
                        x.MerchantID == merchantId &&
                        !x.IsDeleted &&
                        (x.PaperCode == request.PaperCode ||
                         x.LanguageCode == request.LanguageCode));

                if (duplicate)
                    throw Error("Paper code or language already exists.");

                entity.PaperCode = request.PaperCode;
                entity.PaperName = request.PaperName;
                entity.LanguageCode = request.LanguageCode;
                entity.Sort = request.Sort;
                entity.Status = request.Status;
                entity.UpdatedAt = DateTime.UtcNow;
                entity.UpdatedBy = userId;

                await db.SaveChangesAsync();
                return MapPaper(entity);
            }
        }

        public async Task DeletePaperAsync(string merchantId, long userId, long id)
        {
            ValidateIdentity(merchantId, userId);

            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var entity = await db.tbl_WillQuiz_Paper.FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (entity == null)
                    throw Error("Paper not found.");

                entity.IsDeleted = true;
                entity.Status = 0;
                entity.UpdatedAt = DateTime.UtcNow;
                entity.UpdatedBy = userId;

                await db.SaveChangesAsync();
            }
        }

        // ============================================================
        // SECTION VALIDATION
        // ============================================================

        private static void ValidateSection(WillQuizSectionSaveRequest request)
        {
            if (request == null)
                throw Error("Invalid section request.");

            if (request.Sort < 0 || (request.Status != 0 && request.Status != 1))
                throw Error("Invalid section sort or status.");

            if (request.EN == null || request.ZH == null)
                throw Error("English and Chinese section translations are required.");

            request.EN.SectionName = Clean(request.EN.SectionName);
            request.ZH.SectionName = Clean(request.ZH.SectionName);
            request.EN.Description = string.IsNullOrWhiteSpace(request.EN.Description) ? null : request.EN.Description.Trim();
            request.ZH.Description = string.IsNullOrWhiteSpace(request.ZH.Description) ? null : request.ZH.Description.Trim();

            if (request.EN.SectionName.Length == 0 || request.ZH.SectionName.Length == 0 || request.EN.SectionName.Length > 200 || request.ZH.SectionName.Length > 200)
                throw Error("Invalid section translation name.");

            if ((request.EN.Description?.Length ?? 0) > 1000 || (request.ZH.Description?.Length ?? 0) > 1000)
                throw Error("Section description exceeds 1000 characters.");
        }

        private static WillQuizSectionResult MapSection(tbl_WillQuiz_Section section, IEnumerable<tbl_WillQuiz_SectionText> translations)
        {
            var texts = translations.ToList();
            var en = texts.FirstOrDefault(x => x.LanguageCode == "EN");
            var zh = texts.FirstOrDefault(x => x.LanguageCode == "ZH");

            return new WillQuizSectionResult
            {
                RowID = section.RowID,
                SectionCode = section.SectionCode,
                Sort = section.Sort,
                Status = section.Status,
                EN = en == null ? null :
                    new WillQuizSectionTextResult
                    {
                        SectionName = en.SectionName,
                        Description = en.Description
                    },
                ZH = zh == null ? null :
                    new WillQuizSectionTextResult
                    {
                        SectionName = zh.SectionName,
                        Description = zh.Description
                    },
                CreatedAt = section.CreatedAt,
                CreatedBy = section.CreatedBy,
                UpdatedAt = section.UpdatedAt,
                UpdatedBy = section.UpdatedBy
            };
        }

        public async Task<List<WillQuizSectionResult>> GetSectionsAsync(string merchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var sections = await db.tbl_WillQuiz_Section
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && !x.IsDeleted)
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.RowID)
                    .ToListAsync();

                var ids = sections.Select(x => x.RowID).ToList();

                var texts = await db.tbl_WillQuiz_SectionText
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.SectionID))
                    .ToListAsync();

                return sections.Select(x =>
                    MapSection(x, texts.Where(t => t.SectionID == x.RowID)))
                    .ToList();
            }
        }

        public async Task<WillQuizSectionResult> CreateSectionAsync(string merchantId, long userId, WillQuizSectionSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidateSection(request);
            request.SectionCode = Guid.NewGuid().ToString("D");

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);

                bool duplicate = await db.tbl_WillQuiz_Section
                    .AnyAsync(x =>
                        x.MerchantID == merchantId &&
                        x.SectionCode == request.SectionCode &&
                        !x.IsDeleted);

                if (duplicate)
                    throw Error("Section code already exists.");

                var entity = new tbl_WillQuiz_Section
                {
                    MerchantID = merchantId,
                    SectionCode = request.SectionCode,
                    Sort = request.Sort,
                    Status = request.Status,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId
                };

                db.tbl_WillQuiz_Section.Add(entity);

                // Save identity before inserting translations.
                await db.SaveChangesAsync();

                var en = new tbl_WillQuiz_SectionText
                {
                    SectionID = entity.RowID,
                    LanguageCode = "EN",
                    SectionName = request.EN.SectionName,
                    Description = request.EN.Description
                };

                var zh = new tbl_WillQuiz_SectionText
                {
                    SectionID = entity.RowID,
                    LanguageCode = "ZH",
                    SectionName = request.ZH.SectionName,
                    Description = request.ZH.Description
                };

                db.tbl_WillQuiz_SectionText.Add(en);
                db.tbl_WillQuiz_SectionText.Add(zh);

                await db.SaveChangesAsync();
                tx.Commit();

                return MapSection(entity, new[] { en, zh });
            }
        }

        public async Task<WillQuizSectionResult> UpdateSectionAsync(string merchantId, long userId, long id, WillQuizSectionSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidateSection(request);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);

                var entity = await db.tbl_WillQuiz_Section
                    .FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (entity == null)
                    throw Error("Section not found.");

                entity.Sort = request.Sort;
                entity.Status = request.Status;
                entity.UpdatedAt = DateTime.UtcNow;
                entity.UpdatedBy = userId;

                var texts = await db.tbl_WillQuiz_SectionText.Where(x => x.SectionID == id).ToListAsync();
                var en = texts.FirstOrDefault(x => x.LanguageCode == "EN");
                var zh = texts.FirstOrDefault(x => x.LanguageCode == "ZH");

                if (en == null || zh == null)
                    throw Error("Section translations are incomplete.");

                en.SectionName = request.EN.SectionName;
                en.Description = request.EN.Description;

                zh.SectionName = request.ZH.SectionName;
                zh.Description = request.ZH.Description;

                await db.SaveChangesAsync();
                tx.Commit();

                return MapSection(entity, texts);
            }
        }

        public async Task DeleteSectionAsync(string merchantId, long userId, long id)
        {
            ValidateIdentity(merchantId, userId);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);

                var entity = await db.tbl_WillQuiz_Section.FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (entity == null)
                    throw Error("Section not found.");

                bool hasQuestions = await db.tbl_WillQuiz_Question.AnyAsync(x => x.MerchantID == merchantId && x.SectionID == id && !x.IsDeleted);

                if (hasQuestions)
                    throw Error("Cannot delete a section containing active questions.");

                entity.IsDeleted = true;
                entity.Status = 0;
                entity.UpdatedAt = DateTime.UtcNow;
                entity.UpdatedBy = userId;

                await db.SaveChangesAsync();
                tx.Commit();
            }
        }

        // ============================================================
        // QUESTION VALIDATION
        // ============================================================

        private static void ValidateQuestion(WillQuizQuestionSaveRequest request)
        {
            if (request == null)
                throw Error("Invalid question request.");

            if (request.SectionID <= 0 || request.QuestionNo <= 0 || request.Sort < 0)
                throw Error("Invalid question details.");

            request.AnswerType = Clean(request.AnswerType).ToUpperInvariant();

            if (request.AnswerType != "SINGLE" &&
                request.AnswerType != "MULTIPLE")
                throw Error("Invalid answer type.");

            if (request.Status != 0 && request.Status != 1)
                throw Error("Invalid question status.");

            if (request.EN == null || request.ZH == null)
                throw Error("English and Chinese question texts are required.");

            request.EN.QuestionText = Clean(request.EN.QuestionText);
            request.ZH.QuestionText = Clean(request.ZH.QuestionText);

            if (request.EN.QuestionText.Length == 0 || request.ZH.QuestionText.Length == 0)
                throw Error("Question translations cannot be empty.");

            if (request.Options == null || request.Options.Count < 2)
                throw Error("Each question requires at least two options.");

            var existingIds = new HashSet<long>();

            int correctCount = 0;

            foreach (var option in request.Options)
            {
                if (option == null)
                    throw Error("Invalid answer option.");

                if (option.RowID.HasValue && option.RowID.Value < 0)
                    throw Error("Invalid option ID.");

                if (option.RowID.GetValueOrDefault() > 0 && !existingIds.Add(option.RowID.Value))
                    throw Error("Duplicate option ID.");

                if (option.Sort < 0)
                    throw Error("Invalid option sort.");

                if (option.EN == null || option.ZH == null)
                    throw Error("Both option translations are required.");

                option.EN.OptionText = Clean(option.EN.OptionText);

                option.ZH.OptionText = Clean(option.ZH.OptionText);

                if (option.EN.OptionText.Length == 0 || option.ZH.OptionText.Length == 0)
                    throw Error("Option translations cannot be empty.");

                if (option.IsCorrect)
                    correctCount++;
            }

            if (request.AnswerType == "SINGLE" &&
                correctCount != 1)
                throw Error("SINGLE questions require exactly one correct option.");

            if (request.AnswerType == "MULTIPLE" &&
                correctCount < 2)
                throw Error("MULTIPLE questions require at least two correct options.");
        }

        private static async Task ValidateQuestionOwnershipAsync(
            Sandbox_BasedEntities db,
            string merchantId,
            long sectionId,
            int questionNo,
            long excludeQuestionId)
        {
            bool validSection = await db.tbl_WillQuiz_Section
                .AnyAsync(x =>
                    x.RowID == sectionId &&
                    x.MerchantID == merchantId &&
                    x.Status == 1 &&
                    !x.IsDeleted);

            if (!validSection)
                throw Error("Active section not found.");

            bool duplicate = await db.tbl_WillQuiz_Question
                .AnyAsync(x =>
                    x.MerchantID == merchantId &&
                    x.QuestionNo == questionNo &&
                    x.RowID != excludeQuestionId &&
                    !x.IsDeleted);

            if (duplicate)
                throw Error("Question number already exists.");
        }

        // ============================================================
        // QUESTION RESULT MAPPING
        // ============================================================

        private static WillQuizQuestionResult MapQuestion(
            tbl_WillQuiz_Question question,
            string sectionCode,
            IEnumerable<tbl_WillQuiz_QuestionText> questionTexts,
            IEnumerable<tbl_WillQuiz_AnswerOption> options,
            IEnumerable<tbl_WillQuiz_AnswerOptionText> optionTexts)
        {
            var qt = questionTexts.ToList();
            var ot = optionTexts.ToList();
            var en = qt.FirstOrDefault(x => x.LanguageCode == "EN");
            var zh = qt.FirstOrDefault(x => x.LanguageCode == "ZH");

            return new WillQuizQuestionResult
            {
                RowID = question.RowID,
                SectionID = question.SectionID,
                SectionCode = sectionCode,
                QuestionNo = question.QuestionNo,
                AnswerType = question.AnswerType,
                Sort = question.Sort,
                Status = question.Status,

                EN = en == null ? null :
                    new WillQuizQuestionTextResult
                    {
                        QuestionText = en.QuestionText
                    },

                ZH = zh == null ? null :
                    new WillQuizQuestionTextResult
                    {
                        QuestionText = zh.QuestionText
                    },

                Options = options
                    .Where(x => !x.IsDeleted)
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.RowID)
                    .Select(x =>
                    {
                        var optionEn = ot.FirstOrDefault(t =>
                            t.OptionID == x.RowID &&
                            t.LanguageCode == "EN");

                        var optionZh = ot.FirstOrDefault(t =>
                            t.OptionID == x.RowID &&
                            t.LanguageCode == "ZH");

                        return new WillQuizAnswerOptionResult
                        {
                            RowID = x.RowID,
                            OptionCode = x.OptionCode,
                            Sort = x.Sort,
                            IsCorrect = x.IsCorrect,

                            EN = optionEn == null ? null :
                                new WillQuizOptionTextResult
                                {
                                    OptionText = optionEn.OptionText
                                },

                            ZH = optionZh == null ? null :
                                new WillQuizOptionTextResult
                                {
                                    OptionText = optionZh.OptionText
                                }
                        };
                    })
                    .ToList(),

                CreatedAt = question.CreatedAt,
                CreatedBy = question.CreatedBy,
                UpdatedAt = question.UpdatedAt,
                UpdatedBy = question.UpdatedBy
            };
        }

        // ============================================================
        // QUESTION LIST
        // ============================================================

        public async Task<List<WillQuizQuestionResult>> GetQuestionsAsync(string merchantId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var questions = await db.tbl_WillQuiz_Question
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId && !x.IsDeleted)
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.QuestionNo)
                    .ToListAsync();

                var sections = await db.tbl_WillQuiz_Section
                    .AsNoTracking()
                    .Where(x => x.MerchantID == merchantId)
                    .ToListAsync();

                var ids = questions.Select(x => x.RowID).ToList();

                var questionTexts = await db.tbl_WillQuiz_QuestionText
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.QuestionID))
                    .ToListAsync();

                var options = await db.tbl_WillQuiz_AnswerOption
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.QuestionID) && !x.IsDeleted)
                    .ToListAsync();

                var optionIds = options.Select(x => x.RowID).ToList();

                var optionTexts = await db.tbl_WillQuiz_AnswerOptionText
                    .AsNoTracking()
                    .Where(x => optionIds.Contains(x.OptionID))
                    .ToListAsync();

                return questions.Select(q =>
                {
                    var section = sections.FirstOrDefault(x => x.RowID == q.SectionID);

                    return MapQuestion(
                        q,
                        section == null ? null : section.SectionCode,
                        questionTexts.Where(x => x.QuestionID == q.RowID),
                        options.Where(x => x.QuestionID == q.RowID), optionTexts);
                }).ToList();
            }
        }

        // ============================================================
        // QUESTION DETAILS
        // ============================================================

        public async Task<WillQuizQuestionResult> GetQuestionAsync(string merchantId, long id)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMerchantAsync(db, merchantId);

                var question = await db.tbl_WillQuiz_Question
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.RowID == id && x.MerchantID == merchantId && !x.IsDeleted);

                if (question == null)
                    throw Error("Question not found.");

                var section = await db.tbl_WillQuiz_Section
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.RowID == question.SectionID &&
                        x.MerchantID == merchantId);

                var questionTexts =
                    await db.tbl_WillQuiz_QuestionText
                        .AsNoTracking()
                        .Where(x => x.QuestionID == id)
                        .ToListAsync();

                var options = await db.tbl_WillQuiz_AnswerOption
                    .AsNoTracking()
                    .Where(x =>
                        x.QuestionID == id &&
                        !x.IsDeleted)
                    .ToListAsync();

                var optionIds = options
                    .Select(x => x.RowID).ToList();

                var optionTexts =
                    await db.tbl_WillQuiz_AnswerOptionText
                        .AsNoTracking()
                        .Where(x => optionIds.Contains(x.OptionID))
                        .ToListAsync();

                return MapQuestion(
                    question,
                    section == null ? null : section.SectionCode,
                    questionTexts,
                    options,
                    optionTexts);
            }
        }

        // ============================================================
        // CREATE QUESTION
        // ============================================================

        public async Task<WillQuizQuestionResult> CreateQuestionAsync(string merchantId, long userId, WillQuizQuestionSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidateQuestion(request);

            long questionId;

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);
                await ValidateQuestionOwnershipAsync(db, merchantId, request.SectionID, request.QuestionNo, 0);

                var question = new tbl_WillQuiz_Question
                {
                    MerchantID = merchantId,
                    SectionID = request.SectionID,
                    QuestionNo = request.QuestionNo,
                    AnswerType = request.AnswerType,
                    Sort = request.Sort,
                    Status = request.Status,
                    IsDeleted = false,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = userId
                };

                db.tbl_WillQuiz_Question.Add(question);
                await db.SaveChangesAsync();

                questionId = question.RowID;

                db.tbl_WillQuiz_QuestionText.Add(
                    new tbl_WillQuiz_QuestionText
                    {
                        QuestionID = questionId,
                        LanguageCode = "EN",
                        QuestionText = request.EN.QuestionText
                    });

                db.tbl_WillQuiz_QuestionText.Add(
                    new tbl_WillQuiz_QuestionText
                    {
                        QuestionID = questionId,
                        LanguageCode = "ZH",
                        QuestionText = request.ZH.QuestionText
                    });

                await db.SaveChangesAsync();

                foreach (var item in request.Options)
                {
                    var option = new tbl_WillQuiz_AnswerOption
                    {
                        QuestionID = questionId,
                        OptionCode = Guid.NewGuid().ToString("D"),
                        Sort = item.Sort,
                        IsCorrect = item.IsCorrect,
                        IsDeleted = false
                    };

                    db.tbl_WillQuiz_AnswerOption.Add(option);
                    await db.SaveChangesAsync();

                    db.tbl_WillQuiz_AnswerOptionText.Add(
                        new tbl_WillQuiz_AnswerOptionText
                        {
                            OptionID = option.RowID,
                            LanguageCode = "EN",
                            OptionText = item.EN.OptionText
                        });

                    db.tbl_WillQuiz_AnswerOptionText.Add(
                        new tbl_WillQuiz_AnswerOptionText
                        {
                            OptionID = option.RowID,
                            LanguageCode = "ZH",
                            OptionText = item.ZH.OptionText
                        });
                }

                await db.SaveChangesAsync();
                tx.Commit();
            }

            return await GetQuestionAsync(merchantId, questionId);
        }

        // ============================================================
        // UPDATE QUESTION AND OPTIONS
        // ============================================================

        public async Task<WillQuizQuestionResult> UpdateQuestionAsync(string merchantId, long userId, long id, WillQuizQuestionSaveRequest request)
        {
            ValidateIdentity(merchantId, userId);
            ValidateQuestion(request);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);

                var question = await db.tbl_WillQuiz_Question
                    .FirstOrDefaultAsync(x =>
                        x.RowID == id &&
                        x.MerchantID == merchantId &&
                        !x.IsDeleted);

                if (question == null)
                    throw Error("Question not found.");

                await ValidateQuestionOwnershipAsync(
                    db, merchantId,
                    request.SectionID,
                    request.QuestionNo, id);

                var existingOptions =
                    await db.tbl_WillQuiz_AnswerOption
                        .Where(x => x.QuestionID == id)
                        .ToListAsync();

                var activeOptions = existingOptions
                    .Where(x => !x.IsDeleted)
                    .ToList();

                var requestedIds = request.Options
                    .Where(x => x.RowID.GetValueOrDefault() > 0)
                    .Select(x => x.RowID.Value)
                    .ToList();

                // Existing IDs must belong to this question and
                // must not already be soft-deleted.
                if (requestedIds.Any(optionId => !activeOptions.Any(x => x.RowID == optionId)))
                {
                    throw Error("An option ID does not belong to this question.");
                }

                // Validate option-code uniqueness against the
                // final active set, not against deleted history.
                question.SectionID = request.SectionID;
                question.QuestionNo = request.QuestionNo;
                question.AnswerType = request.AnswerType;
                question.Sort = request.Sort;
                question.Status = request.Status;
                question.UpdatedAt = DateTime.UtcNow;
                question.UpdatedBy = userId;

                var questionTexts = await db.tbl_WillQuiz_QuestionText.Where(x => x.QuestionID == id).ToListAsync();
                var questionEn = questionTexts.FirstOrDefault(x => x.LanguageCode == "EN");
                var questionZh = questionTexts.FirstOrDefault(x => x.LanguageCode == "ZH");

                if (questionEn == null || questionZh == null)
                    throw Error("Question translations are incomplete.");

                questionEn.QuestionText = request.EN.QuestionText;
                questionZh.QuestionText = request.ZH.QuestionText;

                // Soft-delete omitted active options first.
                foreach (var oldOption in activeOptions)
                {
                    if (!requestedIds.Contains(oldOption.RowID))
                        oldOption.IsDeleted = true;
                }

                // Persist deletions before reusing an OptionCode
                // because the DB has a filtered unique index.
                await db.SaveChangesAsync();

                var existingOptionIds = requestedIds;
                var existingTexts = await db.tbl_WillQuiz_AnswerOptionText.Where(x => existingOptionIds.Contains(x.OptionID)).ToListAsync();

                foreach (var item in request.Options)
                {
                    long optionId;

                    if (item.RowID.GetValueOrDefault() > 0)
                    {
                        var option = activeOptions.First(x => x.RowID == item.RowID.Value);

                        option.Sort = item.Sort;
                        option.IsCorrect = item.IsCorrect;
                        optionId = option.RowID;

                        var en = existingTexts.FirstOrDefault(x => x.OptionID == optionId && x.LanguageCode == "EN");
                        var zh = existingTexts.FirstOrDefault(x => x.OptionID == optionId && x.LanguageCode == "ZH");

                        if (en == null || zh == null)
                            throw Error("Option translations are incomplete.");

                        en.OptionText = item.EN.OptionText;
                        zh.OptionText = item.ZH.OptionText;
                    }
                    else
                    {
                        var option = new tbl_WillQuiz_AnswerOption
                        {
                            QuestionID = id,
                            OptionCode = Guid.NewGuid().ToString("D"),
                            Sort = item.Sort,
                            IsCorrect = item.IsCorrect,
                            IsDeleted = false
                        };

                        db.tbl_WillQuiz_AnswerOption.Add(option);
                        await db.SaveChangesAsync();

                        optionId = option.RowID;

                        db.tbl_WillQuiz_AnswerOptionText.Add(
                            new tbl_WillQuiz_AnswerOptionText
                            {
                                OptionID = optionId,
                                LanguageCode = "EN",
                                OptionText = item.EN.OptionText
                            });

                        db.tbl_WillQuiz_AnswerOptionText.Add(
                            new tbl_WillQuiz_AnswerOptionText
                            {
                                OptionID = optionId,
                                LanguageCode = "ZH",
                                OptionText = item.ZH.OptionText
                            });
                    }
                }

                await db.SaveChangesAsync();
                tx.Commit();
            }

            return await GetQuestionAsync(merchantId, id);
        }

        // ============================================================
        // SOFT-DELETE QUESTION
        // ============================================================

        public async Task DeleteQuestionAsync(string merchantId, long userId, long id)
        {
            ValidateIdentity(merchantId, userId);

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMerchantAsync(db, merchantId);

                var question = await db.tbl_WillQuiz_Question
                    .FirstOrDefaultAsync(x =>
                        x.RowID == id &&
                        x.MerchantID == merchantId &&
                        !x.IsDeleted);

                if (question == null)
                    throw Error("Question not found.");

                question.IsDeleted = true;
                question.Status = 0;
                question.UpdatedAt = DateTime.UtcNow;
                question.UpdatedBy = userId;

                var options = await db.tbl_WillQuiz_AnswerOption
                    .Where(x => x.QuestionID == id && !x.IsDeleted)
                    .ToListAsync();

                foreach (var option in options)
                    option.IsDeleted = true;

                await db.SaveChangesAsync();
                tx.Commit();
            }
        }
    }
}