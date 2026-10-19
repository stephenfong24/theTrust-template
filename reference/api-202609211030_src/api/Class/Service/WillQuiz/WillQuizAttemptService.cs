
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
    public class WillQuizAttemptService
    {
        private const string Code = "WILL-QUIZ-ATTEMPT";

        private static BusinessException Error(string message)
        {
            return new BusinessException(message, Code);
        }

        // ============================================================
        // AUTHENTICATED MEMBER VALIDATION
        // ============================================================

        private static async Task ValidateMemberAsync(
            Sandbox_BasedEntities db,
            string merchantId,
            long memberId)
        {
            if (string.IsNullOrWhiteSpace(merchantId) ||
                memberId <= 0)
            {
                throw Error("Invalid authenticated member.");
            }

            bool merchantExists = await db.tbl_Merchant
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MerchantID == merchantId &&
                    x.Status == 0);

            if (!merchantExists)
                throw Error("Invalid merchant account.");

            bool memberExists = await db.tbl_MemberInfo
                .AsNoTracking()
                .AnyAsync(x =>
                    x.RowID == memberId &&
                    !x.IsDeleted &&
                    x.Status == 0);

            if (!memberExists)
                throw Error("Invalid member account.");

            bool belongsToMerchant = await db.tbl_Reference
                .AsNoTracking()
                .AnyAsync(x =>
                    x.MerchantID == merchantId &&
                    x.MemberID == memberId &&
                    x.Status == 0);

            if (!belongsToMerchant)
                throw Error(
                    "Member does not belong to this merchant.");
        }

        private static async Task<tbl_WillQuiz_Attempt>
            GetCurrentEntityAsync(
                Sandbox_BasedEntities db,
                string merchantId,
                long memberId)
        {
            return await db.tbl_WillQuiz_Attempt
                .FirstOrDefaultAsync(x =>
                    x.MerchantID == merchantId &&
                    x.MemberID == memberId &&
                    x.Status == "IN_PROGRESS");
        }

        private static async Task<tbl_WillQuiz_Attempt>
            RequireCurrentAsync(
                Sandbox_BasedEntities db,
                string merchantId,
                long memberId)
        {
            var attempt = await GetCurrentEntityAsync(
                db, merchantId, memberId);

            if (attempt == null)
                throw Error("No unfinished quiz attempt found.");

            return attempt;
        }

        private static async Task<WillQuizAttemptProgressResult>
            MapProgressAsync(
                Sandbox_BasedEntities db,
                tbl_WillQuiz_Attempt attempt)
        {
            int version = await db.tbl_WillQuiz_Publication
                .AsNoTracking()
                .Where(x => x.RowID == attempt.PublicationID)
                .Select(x => x.VersionNo)
                .FirstAsync();

            return new WillQuizAttemptProgressResult
            {
                AttemptID = attempt.RowID,
                PublicationID = attempt.PublicationID,
                VersionNo = version,
                LanguageCode = attempt.LanguageCode,
                Status = attempt.Status,
                TotalQuestions = attempt.TotalQuestions,
                AnsweredQuestions = attempt.AnsweredQuestions,
                RemainingQuestions =
                    attempt.TotalQuestions - attempt.AnsweredQuestions,
                CorrectAnswers = attempt.CorrectAnswers,
                MinimumCorrectAnswers =
                    attempt.MinimumCorrectAnswers,
                StartedAt = attempt.StartedAt,
                CompletedAt = attempt.CompletedAt
            };
        }

        private static WillQuizAttemptResult MapResult(
            tbl_WillQuiz_Attempt attempt)
        {
            if (attempt.Status != "COMPLETED" ||
                !attempt.CompletedAt.HasValue ||
                !attempt.IsPassed.HasValue)
            {
                throw Error("Quiz has not been completed.");
            }

            return new WillQuizAttemptResult
            {
                AttemptID = attempt.RowID,
                PublicationID = attempt.PublicationID,
                TotalQuestions = attempt.TotalQuestions,
                AnsweredQuestions = attempt.AnsweredQuestions,
                CorrectAnswers = attempt.CorrectAnswers,
                MinimumCorrectAnswers =
                    attempt.MinimumCorrectAnswers,
                IsPassed = attempt.IsPassed.Value,
                CompletedAt = attempt.CompletedAt.Value
            };
        }

        // ============================================================
        // GET AVAILABLE PAPERS
        // ============================================================

        public async Task<List<WillQuizAvailablePaperResult>>
            GetAvailablePapersAsync(
                string merchantId,
                long memberId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var publication =
                    await db.tbl_WillQuiz_Publication
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.MerchantID == merchantId &&
                            x.Status == "ACTIVE");

                if (publication == null)
                    return new List<WillQuizAvailablePaperResult>();

                var papers = await db.tbl_WillQuiz_Paper
                    .AsNoTracking()
                    .Where(x =>
                        x.MerchantID == merchantId &&
                        x.Status == 1 &&
                        !x.IsDeleted)
                    .OrderBy(x => x.Sort)
                    .ThenBy(x => x.RowID)
                    .ToListAsync();

                return papers.Select(x =>
                    new WillQuizAvailablePaperResult
                    {
                        PaperID = x.RowID,
                        PaperCode = x.PaperCode,
                        PaperName = x.PaperName,
                        LanguageCode = x.LanguageCode,
                        Sort = x.Sort,
                        PublicationID = publication.RowID,
                        VersionNo = publication.VersionNo,
                        QuestionCount = publication.QuestionCount,
                        MinimumCorrectAnswers =
                            publication.MinimumCorrectAnswers
                    }).ToList();
            }
        }

        // ============================================================
        // START OR RESUME
        // ============================================================

        public async Task<WillQuizAttemptProgressResult>
            StartAsync(
                string merchantId,
                long memberId,
                WillQuizAttemptStartRequest request)
        {
            if (request == null || request.PaperID <= 0)
                throw Error("Invalid quiz paper.");

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var existing = await GetCurrentEntityAsync(
                    db, merchantId, memberId);

                // Resume without changing publication or language.
                if (existing != null)
                {
                    var progress = await MapProgressAsync(
                        db, existing);

                    tx.Commit();
                    return progress;
                }

                var paper = await db.tbl_WillQuiz_Paper
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x =>
                        x.RowID == request.PaperID &&
                        x.MerchantID == merchantId &&
                        x.Status == 1 &&
                        !x.IsDeleted);

                if (paper == null)
                    throw Error("Quiz paper not available.");

                var publication =
                    await db.tbl_WillQuiz_Publication
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.MerchantID == merchantId &&
                            x.Status == "ACTIVE");

                if (publication == null)
                    throw Error("No published quiz is available.");

                var attempt = new tbl_WillQuiz_Attempt
                {
                    MerchantID = merchantId,
                    MemberID = memberId,
                    PublicationID = publication.RowID,
                    PreviousAttemptID = null,
                    LanguageCode = paper.LanguageCode,
                    Status = "IN_PROGRESS",
                    TotalQuestions = publication.QuestionCount,
                    MinimumCorrectAnswers =
                        publication.MinimumCorrectAnswers,
                    AnsweredQuestions = 0,
                    CorrectAnswers = 0,
                    IsPassed = null,
                    StartedAt = DateTime.Now,
                    CompletedAt = null,
                    RestartedAt = null
                };

                db.tbl_WillQuiz_Attempt.Add(attempt);
                await db.SaveChangesAsync();

                var result = new WillQuizAttemptProgressResult
                {
                    AttemptID = attempt.RowID,
                    PublicationID = publication.RowID,
                    VersionNo = publication.VersionNo,
                    LanguageCode = attempt.LanguageCode,
                    Status = attempt.Status,
                    TotalQuestions = attempt.TotalQuestions,
                    AnsweredQuestions = 0,
                    RemainingQuestions = attempt.TotalQuestions,
                    CorrectAnswers = 0,
                    MinimumCorrectAnswers =
                        attempt.MinimumCorrectAnswers,
                    StartedAt = attempt.StartedAt,
                    CompletedAt = null
                };

                tx.Commit();
                return result;
            }
        }

        // ============================================================
        // CURRENT ATTEMPT
        // ============================================================

        public async Task<WillQuizAttemptProgressResult>
            GetCurrentAsync(
                string merchantId,
                long memberId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var attempt = await GetCurrentEntityAsync(
                    db, merchantId, memberId);

                if (attempt == null)
                    return null;

                return await MapProgressAsync(db, attempt);
            }
        }

        // ============================================================
        // RANDOM UNANSWERED QUESTION
        // ============================================================

        public async Task<WillQuizRandomQuestionResult>
            GetRandomQuestionAsync(
                string merchantId,
                long memberId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var attempt = await RequireCurrentAsync(
                    db, merchantId, memberId);

                var answeredIds =
                    await db.tbl_WillQuiz_AttemptAnswer
                        .AsNoTracking()
                        .Where(x => x.AttemptID == attempt.RowID)
                        .Select(x => x.PublicationQuestionID)
                        .ToListAsync();

                var unanswered =
                    await db.tbl_WillQuiz_PublicationQuestion
                        .AsNoTracking()
                        .Where(x =>
                            x.PublicationID == attempt.PublicationID &&
                            !answeredIds.Contains(x.RowID))
                        .Select(x => new
                        {
                            x.RowID,
                            x.QuestionNo,
                            x.SectionCode,
                            x.AnswerType,
                            x.EnglishText,
                            x.ChineseText
                        })
                        .ToListAsync();

                if (unanswered.Count == 0)
                    throw Error("No unanswered questions remain.");

                // Random selection is performed in memory.
                // Avoid EF6 translation of unsupported random methods.
                var random = new Random(
                    Guid.NewGuid().GetHashCode());

                var selected =
                    unanswered[random.Next(unanswered.Count)];

                var options =
                    await db.tbl_WillQuiz_PublicationOption
                        .AsNoTracking()
                        .Where(x =>
                            x.PublicationQuestionID == selected.RowID)
                        .OrderBy(x => x.Sort)
                        .ThenBy(x => x.RowID)
                        .Select(x => new
                        {
                            x.RowID,
                            x.OptionCode,
                            x.EnglishText,
                            x.ChineseText,
                            x.Sort
                        })
                        .ToListAsync();

                bool chinese = attempt.LanguageCode == "ZH";

                return new WillQuizRandomQuestionResult
                {
                    QuestionID = selected.RowID,
                    QuestionNo = selected.QuestionNo,
                    SectionCode = selected.SectionCode,
                    AnswerType = selected.AnswerType,
                    QuestionText = chinese
                        ? selected.ChineseText
                        : selected.EnglishText,
                    LanguageCode = attempt.LanguageCode,

                    Options = options.Select(x =>
                        new WillQuizPublishedOptionResult
                        {
                            OptionID = x.RowID,
                            OptionCode = x.OptionCode,
                            OptionText = chinese
                                ? x.ChineseText
                                : x.EnglishText,
                            Sort = x.Sort
                        }).ToList(),

                    Progress = await MapProgressAsync(db, attempt)
                };
            }
        }

        // ============================================================
        // SUBMIT ANSWER
        // ============================================================

        public async Task<WillQuizAttemptAnswerResult>
            SubmitAnswerAsync(
                string merchantId,
                long memberId,
                WillQuizAttemptAnswerRequest request)
        {
            if (request == null ||
                request.QuestionID <= 0 ||
                request.SelectedOptionIDs == null ||
                request.SelectedOptionIDs.Count == 0)
            {
                throw Error("Invalid quiz answer.");
            }

            var selectedIds = request.SelectedOptionIDs;

            if (selectedIds.Any(x => x <= 0) ||
                selectedIds.Distinct().Count() != selectedIds.Count)
            {
                throw Error(
                    "Selected options must contain distinct valid IDs.");
            }

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var attempt = await RequireCurrentAsync(
                    db, merchantId, memberId);

                var question =
                    await db.tbl_WillQuiz_PublicationQuestion
                        .AsNoTracking()
                        .FirstOrDefaultAsync(x =>
                            x.RowID == request.QuestionID &&
                            x.PublicationID == attempt.PublicationID);

                if (question == null)
                    throw Error(
                        "Question does not belong to this attempt.");

                bool alreadyAnswered =
                    await db.tbl_WillQuiz_AttemptAnswer
                        .AnyAsync(x =>
                            x.AttemptID == attempt.RowID &&
                            x.PublicationQuestionID == question.RowID);

                if (alreadyAnswered)
                    throw Error("Question has already been answered.");

                var options =
                    await db.tbl_WillQuiz_PublicationOption
                        .AsNoTracking()
                        .Where(x =>
                            x.PublicationQuestionID == question.RowID)
                        .Select(x => new
                        {
                            x.RowID,
                            x.IsCorrect
                        })
                        .ToListAsync();

                if (options.Count < 2)
                    throw Error(
                        "Published question has invalid options.");

                if (selectedIds.Any(id =>
                    !options.Any(x => x.RowID == id)))
                {
                    throw Error(
                        "A selected option does not belong to the question.");
                }

                if (question.AnswerType == "SINGLE" &&
                    selectedIds.Count != 1)
                {
                    throw Error(
                        "SINGLE questions require one selected option.");
                }

                if (question.AnswerType != "SINGLE" &&
                    question.AnswerType != "MULTIPLE")
                {
                    throw Error("Invalid published answer type.");
                }

                var correctIds = options
                    .Where(x => x.IsCorrect)
                    .Select(x => x.RowID)
                    .ToList();

                bool isCorrect =
                    selectedIds.Count == correctIds.Count &&
                    !selectedIds.Except(correctIds).Any();

                var answer = new tbl_WillQuiz_AttemptAnswer
                {
                    AttemptID = attempt.RowID,
                    PublicationQuestionID = question.RowID,
                    IsCorrect = isCorrect,
                    AnsweredAt = DateTime.Now
                };

                db.tbl_WillQuiz_AttemptAnswer.Add(answer);
                await db.SaveChangesAsync();

                foreach (long optionId in selectedIds)
                {
                    db.tbl_WillQuiz_AttemptAnswerOption.Add(
                        new tbl_WillQuiz_AttemptAnswerOption
                        {
                            AttemptAnswerID = answer.RowID,
                            PublicationOptionID = optionId
                        });
                }

                attempt.AnsweredQuestions++;

                if (isCorrect)
                    attempt.CorrectAnswers++;

                bool completed =
                    attempt.AnsweredQuestions == attempt.TotalQuestions;

                if (completed)
                {
                    attempt.Status = "COMPLETED";
                    attempt.CompletedAt = DateTime.Now;
                    attempt.IsPassed =
                        attempt.CorrectAnswers >=
                        attempt.MinimumCorrectAnswers;
                }

                await db.SaveChangesAsync();

                var response = new WillQuizAttemptAnswerResult
                {
                    AttemptID = attempt.RowID,
                    QuestionID = question.RowID,
                    AnsweredQuestions = attempt.AnsweredQuestions,
                    RemainingQuestions =
                        attempt.TotalQuestions -
                        attempt.AnsweredQuestions,
                    IsCompleted = completed,
                    Result = completed
                        ? MapResult(attempt)
                        : null
                };

                tx.Commit();
                return response;
            }
        }

        // ============================================================
        // CHANGE LANGUAGE
        // ============================================================

        public async Task<WillQuizAttemptProgressResult>
            ChangeLanguageAsync(
                string merchantId,
                long memberId,
                WillQuizAttemptLanguageRequest request)
        {
            if (request == null)
                throw Error("Invalid language request.");

            string language = (request.LanguageCode ?? "")
                .Trim().ToUpperInvariant();

            if (language != "EN" && language != "ZH")
                throw Error("Language must be EN or ZH.");

            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var attempt = await RequireCurrentAsync(
                    db, merchantId, memberId);

                attempt.LanguageCode = language;

                await db.SaveChangesAsync();

                var result = await MapProgressAsync(
                    db, attempt);

                tx.Commit();
                return result;
            }
        }

        // ============================================================
        // RESTART UNFINISHED ATTEMPT
        // ============================================================

        public async Task<WillQuizAttemptRestartResult>
            RestartAsync(
                string merchantId,
                long memberId)
        {
            using (var db = new Sandbox_BasedEntities())
            using (var tx = db.Database.BeginTransaction(
                IsolationLevel.Serializable))
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var previous = await RequireCurrentAsync(
                    db, merchantId, memberId);

                long previousId = previous.RowID;
                DateTime now = DateTime.Now;

                // Restart the same publication to preserve the
                // original quiz content and scoring threshold.
                previous.Status = "RESTARTED";
                previous.RestartedAt = now;
                previous.IsPassed = null;
                previous.CompletedAt = null;

                // Flush old status first to satisfy the filtered
                // unique index on IN_PROGRESS attempts.
                await db.SaveChangesAsync();

                var attempt = new tbl_WillQuiz_Attempt
                {
                    MerchantID = merchantId,
                    MemberID = memberId,
                    PublicationID = previous.PublicationID,
                    PreviousAttemptID = previousId,
                    LanguageCode = previous.LanguageCode,
                    Status = "IN_PROGRESS",
                    TotalQuestions = previous.TotalQuestions,
                    MinimumCorrectAnswers =
                        previous.MinimumCorrectAnswers,
                    AnsweredQuestions = 0,
                    CorrectAnswers = 0,
                    IsPassed = null,
                    StartedAt = now,
                    CompletedAt = null,
                    RestartedAt = null
                };

                db.tbl_WillQuiz_Attempt.Add(attempt);
                await db.SaveChangesAsync();

                var result = new WillQuizAttemptRestartResult
                {
                    PreviousAttemptID = previousId,
                    AttemptID = attempt.RowID,
                    PublicationID = attempt.PublicationID,
                    LanguageCode = attempt.LanguageCode,
                    Status = attempt.Status,
                    TotalQuestions = attempt.TotalQuestions,
                    AnsweredQuestions = 0,
                    CorrectAnswers = 0,
                    StartedAt = attempt.StartedAt
                };

                tx.Commit();
                return result;
            }
        }

        // ============================================================
        // GET MOST RECENT COMPLETED RESULT
        // ============================================================

        public async Task<WillQuizAttemptResult>
            GetResultAsync(
                string merchantId,
                long memberId)
        {
            using (var db = new Sandbox_BasedEntities())
            {
                await ValidateMemberAsync(
                    db, merchantId, memberId);

                var attempt = await db.tbl_WillQuiz_Attempt
                    .AsNoTracking()
                    .Where(x =>
                        x.MerchantID == merchantId &&
                        x.MemberID == memberId &&
                        x.Status == "COMPLETED")
                    .OrderByDescending(x => x.CompletedAt)
                    .ThenByDescending(x => x.RowID)
                    .FirstOrDefaultAsync();

                if (attempt == null)
                    throw Error("No completed quiz result found.");

                return MapResult(attempt);
            }
        }
    }
}
