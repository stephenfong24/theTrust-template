using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace API_CPX.Class.Model.DTO.WillQuiz
{
    // ============================================================
    // 1. CONFIGURATION
    // ============================================================

    public class WillQuizConfigUpdateRequest
    {
        [Range(typeof(decimal), "0", "9999999999999999.99")]
        public decimal Clause_Amount { get; set; }

        [Range(1, int.MaxValue)]
        public int WillQuizMinCorrectAnswers { get; set; }
    }

    public class WillQuizConfigResult
    {
        public decimal Clause_Amount { get; set; }
        public int WillQuizMinCorrectAnswers { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }

    // ============================================================
    // 2. PAPER MANAGEMENT
    // ============================================================

    public class WillQuizPaperSaveRequest
    {
        [Required]
        [StringLength(50)]
        public string PaperCode { get; set; }

        [Required]
        [StringLength(200)]
        public string PaperName { get; set; }

        [Required]
        [RegularExpression("^(EN|ZH)$")]
        public string LanguageCode { get; set; }

        [Range(0, int.MaxValue)]
        public int Sort { get; set; }

        [Range(0, 1)]
        public int Status { get; set; } = 1;
    }

    public class WillQuizPaperResult
    {
        public long RowID { get; set; }
        public string PaperCode { get; set; }
        public string PaperName { get; set; }
        public string LanguageCode { get; set; }
        public int Sort { get; set; }
        public int Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }

    // ============================================================
    // 3. SECTION MANAGEMENT
    // ============================================================

    public class WillQuizSectionTextRequest
    {
        [Required]
        [StringLength(200)]
        public string SectionName { get; set; }

        [StringLength(1000)]
        public string Description { get; set; }
    }

    public class WillQuizSectionSaveRequest
    {
        [StringLength(50)]
        public string SectionCode { get; set; }

        [Range(0, int.MaxValue)]
        public int Sort { get; set; }

        [Range(0, 1)]
        public int Status { get; set; } = 1;

        [Required]
        public WillQuizSectionTextRequest EN { get; set; }

        [Required]
        public WillQuizSectionTextRequest ZH { get; set; }
    }

    public class WillQuizSectionTextResult
    {
        public string SectionName { get; set; }
        public string Description { get; set; }
    }

    public class WillQuizSectionResult
    {
        public long RowID { get; set; }
        public string SectionCode { get; set; }
        public int Sort { get; set; }
        public int Status { get; set; }
        public int TotalQuestions { get; set; }
        public WillQuizSectionTextResult EN { get; set; }
        public WillQuizSectionTextResult ZH { get; set; }
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }

    // ============================================================
    // 4. QUESTION MANAGEMENT
    // ============================================================

    public class WillQuizQuestionTextRequest
    {
        [Required]
        public string QuestionText { get; set; }
    }

    public class WillQuizOptionTextRequest
    {
        [Required]
        public string OptionText { get; set; }
    }

    public class WillQuizAnswerOptionSaveRequest
    {
        // Null or zero means a new option.
        // A positive ID identifies an existing option on update.
        public long? RowID { get; set; }

        [StringLength(50)]
        public string OptionCode { get; set; }

        [Range(0, int.MaxValue)]
        public int Sort { get; set; }

        public bool IsCorrect { get; set; }

        [Required]
        public WillQuizOptionTextRequest EN { get; set; }

        [Required]
        public WillQuizOptionTextRequest ZH { get; set; }
    }

    public class WillQuizQuestionSaveRequest
    {
        [Range(1, long.MaxValue)]
        public long SectionID { get; set; }

        [Range(1, int.MaxValue)]
        public int QuestionNo { get; set; }

        [Required]
        [RegularExpression("^(SINGLE|MULTIPLE)$")]
        public string AnswerType { get; set; }

        [Range(0, int.MaxValue)]
        public int Sort { get; set; }

        [Range(0, 1)]
        public int Status { get; set; } = 1;

        [Required]
        public WillQuizQuestionTextRequest EN { get; set; }

        [Required]
        public WillQuizQuestionTextRequest ZH { get; set; }

        [Required]
        public List<WillQuizAnswerOptionSaveRequest> Options { get; set; } = new List<WillQuizAnswerOptionSaveRequest>();
    }

    public class WillQuizQuestionTextResult
    {
        public string QuestionText { get; set; }
    }

    public class WillQuizOptionTextResult
    {
        public string OptionText { get; set; }
    }

    public class WillQuizAnswerOptionResult
    {
        public long RowID { get; set; }
        public string OptionCode { get; set; }
        public int Sort { get; set; }
        public bool IsCorrect { get; set; }
        public WillQuizOptionTextResult EN { get; set; }
        public WillQuizOptionTextResult ZH { get; set; }
    }

    public class WillQuizQuestionResult
    {
        public long RowID { get; set; }
        public long SectionID { get; set; }
        public string SectionCode { get; set; }
        public int QuestionNo { get; set; }
        public string AnswerType { get; set; }
        public int Sort { get; set; }
        public int Status { get; set; }
        public WillQuizQuestionTextResult EN { get; set; }
        public WillQuizQuestionTextResult ZH { get; set; }
        public List<WillQuizAnswerOptionResult> Options { get; set; } = new List<WillQuizAnswerOptionResult>();
        public DateTime CreatedAt { get; set; }
        public long CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public long? UpdatedBy { get; set; }
    }

    // ============================================================
    // 5. PUBLICATION
    // ============================================================

    public class WillQuizPublicationResult
    {
        public long RowID { get; set; }
        public int VersionNo { get; set; }
        public string Status { get; set; }
        public int QuestionCount { get; set; }
        public int MinimumCorrectAnswers { get; set; }
        public DateTime PublishedAt { get; set; }
        public long PublishedBy { get; set; }
    }

    // ============================================================
    // 6. AVAILABLE PAPERS
    // ============================================================

    public class WillQuizAvailablePaperResult
    {
        public long PaperID { get; set; }
        public string PaperCode { get; set; }
        public string PaperName { get; set; }
        public string LanguageCode { get; set; }
        public int Sort { get; set; }
        public long PublicationID { get; set; }
        public int VersionNo { get; set; }
        public int QuestionCount { get; set; }
        public int MinimumCorrectAnswers { get; set; }
    }

    // ============================================================
    // 7. ATTEMPT START
    // ============================================================

    public class WillQuizAttemptStartRequest
    {
        [Range(1, long.MaxValue)]
        public long PaperID { get; set; }
    }

    // ============================================================
    // 8. ATTEMPT PROGRESS
    // ============================================================

    public class WillQuizAttemptProgressResult
    {
        public long AttemptID { get; set; }
        public long PublicationID { get; set; }
        public int VersionNo { get; set; }
        public string LanguageCode { get; set; }
        public string Status { get; set; }
        public int TotalQuestions { get; set; }
        public int AnsweredQuestions { get; set; }
        public int RemainingQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public int MinimumCorrectAnswers { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    // ============================================================
    // 9. RANDOM QUESTION
    // ============================================================

    public class WillQuizPublishedOptionResult
    {
        public long OptionID { get; set; }
        public string OptionCode { get; set; }
        public string OptionText { get; set; }
        public int Sort { get; set; }
    }

    public class WillQuizRandomQuestionResult
    {
        // Published question ID, not master question ID.
        public long QuestionID { get; set; }
        public int QuestionNo { get; set; }
        public string SectionCode { get; set; }
        public string AnswerType { get; set; }
        public string QuestionText { get; set; }
        public string LanguageCode { get; set; }
        public List<WillQuizPublishedOptionResult> Options { get; set; } = new List<WillQuizPublishedOptionResult>();
        public WillQuizAttemptProgressResult Progress { get; set; }
    }

    // ============================================================
    // 10. ANSWER SUBMISSION
    // ============================================================

    public class WillQuizAttemptAnswerRequest
    {
        [Range(1, long.MaxValue)]
        public long QuestionID { get; set; }

        [Required]
        public List<long> SelectedOptionIDs { get; set; }
    }

    public class WillQuizAttemptAnswerResult
    {
        public long AttemptID { get; set; }
        public long QuestionID { get; set; }
        public int AnsweredQuestions { get; set; }
        public int RemainingQuestions { get; set; }
        public bool IsCompleted { get; set; }
        // Do not expose per-question correctness here.
        // Final result is available after completion.
        public WillQuizAttemptResult Result { get; set; }
    }

    // ============================================================
    // 11. LANGUAGE SWITCHING
    // ============================================================

    public class WillQuizAttemptLanguageRequest
    {
        [Required]
        [RegularExpression("^(EN|ZH)$")]
        public string LanguageCode { get; set; }
    }

    // ============================================================
    // 12. RESTART
    // ============================================================

    public class WillQuizAttemptRestartResult
    {
        public long PreviousAttemptID { get; set; }
        public long AttemptID { get; set; }
        public long PublicationID { get; set; }
        public string LanguageCode { get; set; }
        public string Status { get; set; }
        public int TotalQuestions { get; set; }
        public int AnsweredQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public DateTime StartedAt { get; set; }
    }

    // ============================================================
    // 13. FINAL RESULT
    // ============================================================

    public class WillQuizAttemptResult
    {
        public long AttemptID { get; set; }
        public long PublicationID { get; set; }
        public int TotalQuestions { get; set; }
        public int AnsweredQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public int MinimumCorrectAnswers { get; set; }
        public bool IsPassed { get; set; }
        public DateTime CompletedAt { get; set; }
    }

    // ============================================================
    // 14. COMPLETED ATTEMPT REVIEW
    // ============================================================

    public class WillQuizAttemptReviewOptionResult
    {
        public long OptionID { get; set; }
        public string OptionCode { get; set; }
        public string OptionText { get; set; }
        public int Sort { get; set; }
        public bool IsSelected { get; set; }
        public bool IsCorrect { get; set; }
    }

    public class WillQuizAttemptReviewQuestionResult
    {
        public long QuestionID { get; set; }
        public int QuestionNo { get; set; }
        public string SectionCode { get; set; }
        public string AnswerType { get; set; }
        public string QuestionText { get; set; }
        public bool IsCorrect { get; set; }
        public DateTime AnsweredAt { get; set; }
        public List<WillQuizAttemptReviewOptionResult> Options { get; set; } = new List<WillQuizAttemptReviewOptionResult>();
    }

    public class WillQuizAttemptReviewResult
    {
        public long AttemptID { get; set; }
        public long PublicationID { get; set; }
        public int VersionNo { get; set; }
        public string LanguageCode { get; set; }
        public string Status { get; set; }
        public int TotalQuestions { get; set; }
        public int AnsweredQuestions { get; set; }
        public int CorrectAnswers { get; set; }
        public int MinimumCorrectAnswers { get; set; }
        public bool IsPassed { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime CompletedAt { get; set; }
        public List<WillQuizAttemptReviewQuestionResult> Questions { get; set; } = new List<WillQuizAttemptReviewQuestionResult>();
    }
}
