using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.WillQuiz;
using API_CPX.Class.Service.WillQuiz;
using System;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/will-quiz")]
    [JwtAuthorize]
    public class WillQuizAttemptController : System.Web.Http.ApiController
    {
        private readonly WillQuizAttemptService _service;

        public WillQuizAttemptController()
        {
            _service = new WillQuizAttemptService();
        }

        private string MerchantID
        {
            get
            {
                return Convert.ToString(
                    Request.Properties["MerchantID"]);
            }
        }

        private long MemberID
        {
            get
            {
                return Convert.ToInt64(
                    Request.Properties["UserID"]);
            }
        }

        private void SetAudit(
            string title, string description)
        {
            Request.Properties["AuditTitle"] = title;
            Request.Properties["AuditDescription"] = description;
        }

        private static BusinessException Unexpected(
            string message, string code, Exception ex)
        {
            return new BusinessException(message, code, ex);
        }

        // ============================================================
        // AVAILABLE PAPERS
        // GET /api/will-quiz/available-paper
        // ============================================================

        [HttpGet]
        [Route("available-paper")]
        public async Task<IHttpActionResult> GetAvailablePapers()
        {
            const string code = "GET-WILL-QUIZ-AVAILABLE-PAPERS";

            SetAudit(
                "Will Quiz Available Papers Viewed",
                "Viewed available Will quiz papers.");

            try
            {
                var data = await _service.GetAvailablePapersAsync(
                    MerchantID, MemberID);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to retrieve available quiz papers.",
                    code, ex);
            }
        }

        // ============================================================
        // START OR RESUME
        // POST /api/will-quiz/attempt/start
        // ============================================================

        [HttpPost]
        [Route("attempt/start")]
        public async Task<IHttpActionResult> Start(
            WillQuizAttemptStartRequest request)
        {
            const string code = "START-WILL-QUIZ-ATTEMPT";

            SetAudit(
                "Will Quiz Attempt Started",
                "Attempted to start or resume Will quiz.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException(
                        "Invalid quiz start request.", code);

                var data = await _service.StartAsync(
                    MerchantID, MemberID, request);

                Request.Properties["AuditDescription"] =
                    "Started or resumed Will quiz attempt ID " +
                    data.AttemptID;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to start Will quiz.",
                    code, ex);
            }
        }

        // ============================================================
        // CURRENT ATTEMPT
        // GET /api/will-quiz/attempt/current
        // ============================================================

        [HttpGet]
        [Route("attempt/current")]
        public async Task<IHttpActionResult> GetCurrent()
        {
            const string code = "GET-WILL-QUIZ-CURRENT";

            SetAudit(
                "Will Quiz Progress Viewed",
                "Viewed current Will quiz progress.");

            try
            {
                var data = await _service.GetCurrentAsync(
                    MerchantID, MemberID);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to retrieve current quiz attempt.",
                    code, ex);
            }
        }

        // ============================================================
        // RANDOM UNANSWERED QUESTION
        // GET /api/will-quiz/attempt/question/random
        // ============================================================

        [HttpGet]
        [Route("attempt/question/random")]
        public async Task<IHttpActionResult> GetRandomQuestion()
        {
            const string code = "GET-WILL-QUIZ-RANDOM-QUESTION";

            SetAudit(
                "Will Quiz Question Viewed",
                "Viewed a random unanswered Will quiz question.");

            try
            {
                var data = await _service.GetRandomQuestionAsync(
                    MerchantID, MemberID);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to retrieve quiz question.",
                    code, ex);
            }
        }

        // ============================================================
        // SUBMIT ANSWER
        // POST /api/will-quiz/attempt/answer
        // ============================================================

        [HttpPost]
        [Route("attempt/answer")]
        public async Task<IHttpActionResult> SubmitAnswer(
            WillQuizAttemptAnswerRequest request)
        {
            const string code = "SUBMIT-WILL-QUIZ-ANSWER";

            SetAudit(
                "Will Quiz Answer Submitted",
                "Attempted to submit a Will quiz answer.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException(
                        "Invalid quiz answer request.", code);

                var data = await _service.SubmitAnswerAsync(
                    MerchantID, MemberID, request);

                Request.Properties["AuditDescription"] =
                    "Submitted answer for published question ID " +
                    data.QuestionID +
                    ", attempt ID " +
                    data.AttemptID;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to submit quiz answer.",
                    code, ex);
            }
        }

        // ============================================================
        // CHANGE LANGUAGE
        // PUT /api/will-quiz/attempt/language
        // ============================================================

        [HttpPut]
        [Route("attempt/language")]
        public async Task<IHttpActionResult> ChangeLanguage(
            WillQuizAttemptLanguageRequest request)
        {
            const string code = "CHANGE-WILL-QUIZ-LANGUAGE";

            SetAudit(
                "Will Quiz Language Changed",
                "Attempted to change Will quiz language.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException(
                        "Invalid language request.", code);

                var data = await _service.ChangeLanguageAsync(
                    MerchantID, MemberID, request);

                Request.Properties["AuditDescription"] =
                    "Changed Will quiz attempt ID " +
                    data.AttemptID +
                    " to language " +
                    data.LanguageCode;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to change quiz language.",
                    code, ex);
            }
        }

        // ============================================================
        // RESTART UNFINISHED QUIZ
        // POST /api/will-quiz/attempt/restart
        // ============================================================

        [HttpPost]
        [Route("attempt/restart")]
        public async Task<IHttpActionResult> Restart()
        {
            const string code = "RESTART-WILL-QUIZ-ATTEMPT";

            SetAudit(
                "Will Quiz Restarted",
                "Attempted to restart unfinished Will quiz.");

            try
            {
                var data = await _service.RestartAsync(
                    MerchantID, MemberID);

                Request.Properties["AuditDescription"] =
                    "Restarted Will quiz attempt ID " +
                    data.PreviousAttemptID +
                    " as attempt ID " +
                    data.AttemptID;

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to restart Will quiz.",
                    code, ex);
            }
        }

        // ============================================================
        // COMPLETED RESULT
        // GET /api/will-quiz/attempt/result
        // ============================================================

        [HttpGet]
        [Route("attempt/result")]
        public async Task<IHttpActionResult> GetResult()
        {
            const string code = "GET-WILL-QUIZ-RESULT";

            SetAudit(
                "Will Quiz Result Viewed",
                "Viewed completed Will quiz result.");

            try
            {
                var data = await _service.GetResultAsync(
                    MerchantID, MemberID);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = data
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected(
                    "Unable to retrieve quiz result.",
                    code, ex);
            }
        }
    }
}
