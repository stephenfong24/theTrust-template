using API_CPX.Class.Exceptions;
using API_CPX.Class.Model.DTO.WillQuiz;
using API_CPX.Class.Service.WillQuiz;
using System;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.API.Controller.v1
{
    [RoutePrefix("api/will-quiz/manage")]
    [JwtAuthorize]
    [Authorize(Roles = "SA,AD")]
    public class WillQuizManagementController : System.Web.Http.ApiController
    {
        private readonly WillQuizManagementService _service;

        private readonly WillQuizPublishService _publishService;

        public WillQuizManagementController()
        {
            _service = new WillQuizManagementService();
            _publishService = new WillQuizPublishService();
        }

        private string MerchantID
        {
            get
            {
                return Convert.ToString(Request.Properties["MerchantID"]);
            }
        }

        private long UserID
        {
            get
            {
                return Convert.ToInt64(Request.Properties["UserID"]);
            }
        }

        private void SetAudit(string title, string description)
        {
            Request.Properties["AuditTitle"] = title;
            Request.Properties["AuditDescription"] = description;
        }

        private static BusinessException Unexpected(string message, string code, Exception ex)
        {
            return new BusinessException(message, code, ex);
        }

        // ============================================================
        // PAPER LIST
        // GET /api/will-quiz/manage/paper
        // ============================================================

        [HttpGet]
        [Route("paper")]
        public async Task<IHttpActionResult> GetPapers()
        {
            const string code = "GET-WILL-QUIZ-PAPERS";
            SetAudit("Will Quiz Papers Viewed", "Viewed Will quiz paper listing.");

            try
            {
                var data = await _service.GetPapersAsync(MerchantID);

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
                throw Unexpected("Unable to retrieve quiz papers.", code, ex);
            }
        }

        // ============================================================
        // CREATE PAPER
        // POST /api/will-quiz/manage/paper
        // ============================================================

        [HttpPost]
        [Route("paper")]
        public async Task<IHttpActionResult> CreatePaper(WillQuizPaperSaveRequest request)
        {
            const string code = "CREATE-WILL-QUIZ-PAPER";
            SetAudit("Will Quiz Paper Created", "Attempted to create a Will quiz paper.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid paper request.", code);

                var data = await _service.CreatePaperAsync(MerchantID, UserID, request);

                Request.Properties["AuditDescription"] = "Created Will quiz paper ID " + data.RowID;

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
                throw Unexpected("Unable to create quiz paper.", code, ex);
            }
        }

        // ============================================================
        // UPDATE PAPER
        // PUT /api/will-quiz/manage/paper/{id}
        // ============================================================

        [HttpPut]
        [Route("paper/{id:long}")]
        public async Task<IHttpActionResult> UpdatePaper(long id, WillQuizPaperSaveRequest request)
        {
            const string code = "UPDATE-WILL-QUIZ-PAPER";
            SetAudit("Will Quiz Paper Updated", "Attempted to update Will quiz paper ID " + id);

            try
            {
                if (id <= 0 || request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid paper request.", code);

                var data = await _service.UpdatePaperAsync(MerchantID, UserID, id, request);

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
                throw Unexpected("Unable to update quiz paper.", code, ex);
            }
        }

        // ============================================================
        // DELETE PAPER
        // DELETE /api/will-quiz/manage/paper/{id}
        // ============================================================

        [HttpDelete]
        [Route("paper/{id:long}")]
        public async Task<IHttpActionResult> DeletePaper(long id)
        {
            const string code = "DELETE-WILL-QUIZ-PAPER";
            SetAudit("Will Quiz Paper Deleted", "Attempted to delete Will quiz paper ID " + id);

            try
            {
                if (id <= 0)
                    throw new BusinessException("Invalid paper ID.", code);

                await _service.DeletePaperAsync(MerchantID, UserID, id);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        RowID = id,
                        IsDeleted = true
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to delete quiz paper.", code, ex);
            }
        }

        // ============================================================
        // SECTION LIST
        // GET /api/will-quiz/manage/section
        // ============================================================

        [HttpGet]
        [Route("section")]
        public async Task<IHttpActionResult> GetSections()
        {
            const string code = "GET-WILL-QUIZ-SECTIONS";
            SetAudit("Will Quiz Sections Viewed", "Viewed Will quiz section listing.");

            try
            {
                var data = await _service.GetSectionsAsync(MerchantID);

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
                throw Unexpected("Unable to retrieve quiz sections.", code, ex);
            }
        }

        // ============================================================
        // CREATE SECTION
        // POST /api/will-quiz/manage/section
        // ============================================================

        [HttpPost]
        [Route("section")]
        public async Task<IHttpActionResult> CreateSection(WillQuizSectionSaveRequest request)
        {
            const string code = "CREATE-WILL-QUIZ-SECTION";
            SetAudit("Will Quiz Section Created", "Attempted to create a Will quiz section.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid section request.", code);

                var data = await _service.CreateSectionAsync( MerchantID, UserID, request);

                Request.Properties["AuditDescription"] = "Created Will quiz section ID " + data.RowID;

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
                throw Unexpected("Unable to create quiz section.", code, ex);
            }
        }

        // ============================================================
        // UPDATE SECTION
        // PUT /api/will-quiz/manage/section/{id}
        // ============================================================

        [HttpPut]
        [Route("section/{id:long}")]
        public async Task<IHttpActionResult> UpdateSection(long id, WillQuizSectionSaveRequest request)
        {
            const string code = "UPDATE-WILL-QUIZ-SECTION";
            SetAudit("Will Quiz Section Updated", "Attempted to update Will quiz section ID " + id);

            try
            {
                if (id <= 0 || request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid section request.", code);

                var data = await _service.UpdateSectionAsync(MerchantID, UserID, id, request);

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
                throw Unexpected(ex.Message, code, ex);
            }
        }

        // ============================================================
        // DELETE SECTION
        // DELETE /api/will-quiz/manage/section/{id}
        // ============================================================

        [HttpDelete]
        [Route("section/{id:long}")]
        public async Task<IHttpActionResult> DeleteSection(long id)
        {
            const string code = "DELETE-WILL-QUIZ-SECTION";
            SetAudit("Will Quiz Section Deleted", "Attempted to delete Will quiz section ID " + id);

            try
            {
                if (id <= 0)
                    throw new BusinessException("Invalid section ID.", code);

                await _service.DeleteSectionAsync(MerchantID, UserID, id);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        RowID = id,
                        IsDeleted = true
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to delete quiz section.", code, ex);
            }
        }

        // ============================================================
        // QUESTION LIST
        // GET /api/will-quiz/manage/question
        // ============================================================

        [HttpGet]
        [Route("question")]
        public async Task<IHttpActionResult> GetQuestions()
        {
            const string code = "GET-WILL-QUIZ-QUESTIONS";
            SetAudit("Will Quiz Questions Viewed", "Viewed Will quiz question listing.");

            try
            {
                var data = await _service.GetQuestionsAsync(MerchantID);

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
                throw Unexpected("Unable to retrieve quiz questions.", code, ex);
            }
        }

        // ============================================================
        // QUESTION DETAILS
        // GET /api/will-quiz/manage/question/{id}
        // ============================================================

        [HttpGet]
        [Route("question/{id:long}")]
        public async Task<IHttpActionResult> GetQuestion(long id)
        {
            const string code = "GET-WILL-QUIZ-QUESTION";
            SetAudit("Will Quiz Question Viewed", "Viewed Will quiz question ID " + id);

            try
            {
                if (id <= 0)
                    throw new BusinessException("Invalid question ID.", code);

                var data = await _service.GetQuestionAsync(MerchantID, id);

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
                throw Unexpected("Unable to retrieve quiz question.", code, ex);
            }
        }

        // ============================================================
        // CREATE QUESTION
        // POST /api/will-quiz/manage/question
        // ============================================================

        [HttpPost]
        [Route("question")]
        public async Task<IHttpActionResult> CreateQuestion(WillQuizQuestionSaveRequest request)
        {
            const string code = "CREATE-WILL-QUIZ-QUESTION";
            SetAudit("Will Quiz Question Created", "Attempted to create a Will quiz question.");

            try
            {
                if (request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid question request.", code);

                var data = await _service.CreateQuestionAsync(MerchantID, UserID, request);

                Request.Properties["AuditDescription"] = "Created Will quiz question ID " + data.RowID;

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
                throw Unexpected("Unable to create quiz question.", code, ex);
            }
        }

        // ============================================================
        // UPDATE QUESTION
        // PUT /api/will-quiz/manage/question/{id}
        // ============================================================

        [HttpPut]
        [Route("question/{id:long}")]
        public async Task<IHttpActionResult> UpdateQuestion(long id, WillQuizQuestionSaveRequest request)
        {
            const string code = "UPDATE-WILL-QUIZ-QUESTION";
            SetAudit("Will Quiz Question Updated", "Attempted to update Will quiz question ID " + id);

            try
            {
                if (id <= 0 || request == null || !ModelState.IsValid)
                    throw new BusinessException("Invalid question request.", code);

                var data = await _service.UpdateQuestionAsync(MerchantID, UserID, id, request);

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
                throw Unexpected("Unable to update quiz question.", code, ex);
            }
        }

        // ============================================================
        // DELETE QUESTION
        // DELETE /api/will-quiz/manage/question/{id}
        // ============================================================

        [HttpDelete]
        [Route("question/{id:long}")]
        public async Task<IHttpActionResult> DeleteQuestion(long id)
        {
            const string code = "DELETE-WILL-QUIZ-QUESTION";
            SetAudit("Will Quiz Question Deleted", "Attempted to delete Will quiz question ID " + id);

            try
            {
                if (id <= 0)
                    throw new BusinessException("Invalid question ID.", code);

                await _service.DeleteQuestionAsync(MerchantID, UserID, id);

                return Ok(new
                {
                    Status = 0,
                    Message = "Success",
                    Code = code,
                    Data = new
                    {
                        RowID = id,
                        IsDeleted = true
                    }
                });
            }
            catch (BusinessException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw Unexpected("Unable to delete quiz question.", code, ex);
            }
        }


        // ============================================================
        // PUBLISH QUIZ
        // POST /api/will-quiz/manage/publish
        // ============================================================

        [HttpPost]
        [Route("publish")]
        public async Task<IHttpActionResult> PublishQuiz()
        {
            const string code = "PUBLISH-WILL-QUIZ";
            SetAudit("Will Quiz Published", "Attempted to publish a new Will quiz version.");

            try
            {
                var data = await _publishService.PublishAsync(MerchantID, UserID);

                Request.Properties["AuditDescription"] = "Published Will quiz version " + data.VersionNo + ", publication ID " + data.RowID + ".";

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
                throw Unexpected("Unable to publish Will quiz.", code, ex);
            }
        }

        // ============================================================
        // PUBLICATION LIST
        // GET /api/will-quiz/manage/publication
        // ============================================================

        [HttpGet]
        [Route("publication")]
        public async Task<IHttpActionResult> GetPublications()
        {
            const string code = "GET-WILL-QUIZ-PUBLICATIONS";
            SetAudit("Will Quiz Publications Viewed", "Viewed Will quiz publication history.");

            try
            {
                var data = await _publishService.GetPublicationsAsync(MerchantID);

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
                throw Unexpected("Unable to retrieve Will quiz publications.", code, ex);
            }
        }
    }
}
