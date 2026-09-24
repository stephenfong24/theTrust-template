using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Web.Http;
using Util;

namespace API_CPX.API.Controller
{
    public class UtilityController : ApiController
    {
        public UtilityController()
        {
            //
            // TODO: Add constructor logic here
            //
        }

        public string ErrorMsg
        {
            get { return errorMsg; }
        }

        public bool HasError
        {
            get
            {
                if (ErrorMsg != string.Empty)
                    return true;
                else
                    return false;
            }
        }

        protected wwdb db = null;
        protected string errorMsg = string.Empty;
        protected bool hasError = false;

        protected bool RecordErrorLog(string functionName, string errorMsg, string errorType, string pageUrl, string createdBy)
        {
            //ErrorLogController errorLogController = new ErrorLogController();
            //return errorLogController.AddErrorLog(functionName, errorMsg, errorType, pageUrl, createdBy);
            return true;
        }

        protected void DBClose()
        {
            if (db != null)
            {
                if (db.UseTransaction)
                {
                    if (HasError)
                        db.Rollback();
                    else
                        db.CommitTransaction();
                }
                db.Close();
            }
        }
    }
}