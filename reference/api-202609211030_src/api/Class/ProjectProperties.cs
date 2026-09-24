using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class
{
    public class ProjectProperties
    {
        public ProjectProperties()
        {

        }

        public static string Return_Success = "pass";

        // Member Used
        // ******************************************************

        public static readonly bool Member_ChangeLoginPassword_CanSameWithOld = true;
        public static readonly bool Member_ChangeLoginPassword_CanUsedRecently = true;
        public static readonly bool Member_ChangeSecurityPassword_CanSameWithOld = true;
        public static readonly bool Member_ChangeSecurityPassword_CanUsedRecently = true;
        public static readonly bool Member_OTP_TryAttempts_Suspended = false;
        public static readonly bool Member_Enabled_CheckOldPassword = true;
        public static readonly int Member_Min_Password = 6;
        public static readonly int Member_Max_Password = 30;
        public static readonly int Member_Min_SecurityPassword = 6;
        public static readonly int Member_Max_SecurityPassword = 30;
        public static readonly int Member_OTP_Expired_Minutes = 5;
        public static readonly string DateTime_Format = "yyyy-MM-dd hh:mm tt";
        public static readonly bool Member_SecurityVerification_TryAttempts_Suspended = false;
    }
}