using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Http;

namespace API_CPX.Class.Model.Class
{
    public class ErrorResult : IHttpActionResult
    {
        private readonly HttpRequestMessage _request;
        private readonly Response _response;
        private readonly HttpStatusCode _httpStatusCode;

        public ErrorResult(
            HttpRequestMessage request,
            Response response,
            HttpStatusCode httpStatusCode)
        {
            _request = request;
            _response = response;
            _httpStatusCode = httpStatusCode;
        }

        public Task<HttpResponseMessage> ExecuteAsync(
            CancellationToken cancellationToken)
        {
            return Task.FromResult(
                _request.CreateResponse(
                    _httpStatusCode,
                    _response));
        }
    }
}