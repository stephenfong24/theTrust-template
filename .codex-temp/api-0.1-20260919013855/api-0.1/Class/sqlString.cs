using API_CPX.Class;
using System;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

namespace Util
{
    public class sqlString
    {
        #region Control

        public static void bindControl(GridView gv, string sql)
        {
            wwdb db = new wwdb();

            try
            {
                LogUtil.logSQL(sql);
                gv.DataSource = db.getDataTable(sql);
                gv.DataBind();
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
                db = null;
            }
        }

        public static void bindControl(DropDownList ddl, string sql, string text, string value, bool addSelect)
        {
            wwdb db = new wwdb();

            try
            {
                int record = 0;

                ddl.DataTextField = text;
                ddl.DataValueField = value;

                db.OpenTable(sql);
                record = db.RecordCount();

                if (record == 0)
                    sql = " SELECT N'No Record Found' AS N'" + text + "', '0' AS N'" + value + "' ";

                ddl.DataSource = db.getDataTable(sql);
                ddl.DataBind();

                if (addSelect && record > 0)
                {
                    //ddl.Items.Insert(0, HttpContext.GetGlobalResourceObject("Language", "Please_Choose").ToString());
                    //ddl.Items[0].Value = "0";
                }
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void bindControl(DropDownList ddl, string sql, string text, string value, bool addSelect, string customTitle)
        {
            wwdb db = new wwdb();

            try
            {
                int record = 0;

                ddl.DataTextField = text;
                ddl.DataValueField = value;

                db.OpenTable(sql);
                record = db.RecordCount();

                if (record == 0)
                    sql = " SELECT N'No Record Found' AS N'" + text + "', '0' AS N'" + value + "' ";

                ddl.DataSource = db.getDataTable(sql);
                ddl.DataBind();

                if (addSelect && record > 0)
                {
                    ddl.Items.Insert(0, customTitle);
                    ddl.Items[0].Value = "0";
                }
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void bindControl(CheckBoxList cbl, string sql, string text, string value, bool v)
        {
            wwdb db = new wwdb();

            try
            {
                cbl.DataTextField = text;
                cbl.DataValueField = value;

                db.OpenTable(sql);

                if (db.RecordCount() == 0)
                    sql = " SELECT N'No Record Found' AS N'" + text + "', '0' AS N'" + value + "' ";

                cbl.DataSource = db.getDataTable(sql);
                cbl.DataBind();
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void bindControlbl(ListBox lb, string sql, string text, string value)
        {
            wwdb db = new wwdb();

            try
            {
                lb.DataTextField = text;
                lb.DataValueField = value;

                db.OpenTable(sql);

                if (db.RecordCount() == 0)
                    sql = " SELECT N'No Record Found' AS N'" + text + "', '0' AS N'" + value + "' ";

                lb.DataSource = db.getDataTable(sql);
                lb.DataBind();
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void bindControl(RadioButtonList rbl, string sql, string text, string value, bool v)
        {
            wwdb db = new wwdb();

            try
            {
                rbl.DataTextField = text;
                rbl.DataValueField = value;

                db.OpenTable(sql);

                if (db.RecordCount() == 0)
                    sql = " SELECT N'No Record Found' AS N'" + text + "', '0' AS N'" + value + "' ";

                rbl.DataSource = db.getDataTable(sql);
                rbl.DataBind();
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void bindControl(Repeater rpt, string sql)
        {
            wwdb db = new wwdb();

            try
            {
                LogUtil.logSQL(sql);
                rpt.DataSource = db.getDataTable(sql);
                rpt.DataBind();
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }
        }

        public static void selectDropDownList(DropDownList ddl, string value)
        {
            try
            {
                ddl.ClearSelection();
                if (value != null)
                {
                    ListItem item = ddl.Items.FindByValue(value);

                    if (item != null)
                        ddl.Items.FindByValue(value).Selected = true;
                    else
                        ddl.SelectedIndex = 0;
                }
                else
                    ddl.SelectedIndex = 0;
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), "Select DDL Value");
            }
        }

        public static void selectCheckBoxList(CheckBoxList cbl, string value)
        {
            try
            {
                if (value != null)
                {
                    ListItem item = cbl.Items.FindByValue(value);

                    if (item != null)
                        cbl.Items.FindByValue(value).Selected = true;
                }
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), "Select CBL Value");
            }
        }

        public static void selectListBox(ListBox lb, string value)
        {
            try
            {
                if (value != null)
                {
                    ListItem item = lb.Items.FindByValue(value);

                    if (item != null)
                        lb.Items.FindByValue(value).Selected = true;
                }
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), "Select lb Value");
            }
        }

        public static void selectCheckBoxList(CheckBoxList cbl, string value, out string returnValue)
        {
            returnValue = "";

            try
            {
                if (value != null)
                {
                    ListItem item = cbl.Items.FindByValue(value);

                    if (item != null)
                    {
                        cbl.Items.FindByValue(value).Selected = true;
                        returnValue = item.Text;
                    }
                }
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), "Select CBL Value");
            }
        }

        #endregion

        #region Date Time

        public static string displayDateTime(string column)
        {
            //return "CONVERT(NVARCHAR, " + column + ", 100)";
            return "CONVERT(NVARCHAR, " + column + ", 106) + ' ' + CONVERT(VARCHAR, " + column + ", 108) + ' ' + RIGHT(CONVERT(VARCHAR, " + column + ", 100),2)";
        }

        public static string displayDate(string column)
        {
            return "CONVERT(NVARCHAR, " + column + ", 106)";
        }

        public static DateTime convertDateTime(string input, string currentFormat)
        {
            DateTime newDatetime;
            DateTime.TryParseExact(input, currentFormat, new CultureInfo("en-US"), DateTimeStyles.None, out newDatetime);
            return newDatetime;
        }

        public static string changeDateTime(string input, string oldFormat, string newFormat)
        {
            return DateTime.ParseExact(input, oldFormat, new CultureInfo("en-US")).ToString(newFormat, new CultureInfo("en-US"));
        }

        public static DateTime changeDateTime(string input, string oldFormat)
        {
            return DateTime.ParseExact(input, oldFormat, new CultureInfo("en-US"));
        }

        public static string getCurDate()
        {
            return DateTime.Now.ToString("yyyy-MM-dd hh:mm:ss tt", new CultureInfo("en-US"));
        }

        public static string getWeek(int yearx, int monthx)
        {
            string sql = "", startDate = yearx + "-" + monthx + "-01",
                endDate = DateTime.ParseExact(startDate, "yyyy-M-dd", System.Globalization.CultureInfo.InvariantCulture).AddMonths(1).AddSeconds(-1).ToString("yyyy-MM-dd HH:mm:ss", new CultureInfo("en-US")); ;

            sql = " SET DATEFIRST 1; " +
                    " WITH q (a) AS (SELECT (DATEADD(dd, -1*(DATEPART(dw, N'" + startDate + "')-1), N'" + startDate + "')) " +
                    " UNION ALL SELECT DATEADD(DAY, 7, a) FROM q WHERE a < N'" + endDate + "') " +
                    " SELECT TOP(SELECT COUNT(1) - 1 FROM q) CONVERT(VARCHAR, CONVERT(DATETIME, a), 111) AS 'Value', " +
                    " CONVERT(VARCHAR, CONVERT(DATETIME, a), 107) + ' - ' + " +
                    " CONVERT(VARCHAR, DATEADD(DAY, 6, CONVERT(DATETIME, a)), 107) AS 'Text' FROM q ";

            return sql;
        }

        #endregion

        #region Popup Menu

        public static void OpenNewWindow_Center(String OpenURL,
        String PageTitle,
        int Form_Width,
        int Form_Height,
        Page curPage,
        Boolean Show_ToolBar = false,
        Boolean Show_ScrollBar = false,
        Boolean Show_StatusBar = false,
        Boolean Show_MenuBar = false,
        Boolean Show_Location = false,
        Boolean Resizable = false)
        {
            String JScript = String.Empty;
            Literal Ltr = new Literal();

            //JScript = "<script type=\"text/javascript\">";
            JScript += " var left = (screen.width - " + Form_Width + ") / 2; ";
            JScript += " var top = (screen.height - " + Form_Height + ") / 2; ";
            JScript += " window.open('" + OpenURL + "','" + PageTitle + "',";

            JScript += "'width=" + Form_Width + ",";
            JScript += "height=" + Form_Height + ",";
            JScript += "top='+top+',";
            JScript += "left='+left+',";

            #region Additional Setting

            if (Show_ToolBar) { JScript += ",toolbar=yes"; } else { JScript += ",toolbar=no"; }
            if (Show_ScrollBar) { JScript += ",scrollbars=yes"; } else { JScript += ",toolbar=no"; }
            if (Show_StatusBar) { JScript += ",status=yes"; } else { JScript += ",toolbar=no"; }
            if (Resizable) { JScript += ",resizable=yes"; } else { JScript += ",toolbar=no"; }
            if (Show_MenuBar) { JScript += ",menubar=yes"; } else { JScript += ",toolbar=no"; }
            if (Show_Location) { JScript += ",location=yes"; } else { JScript += ",toolbar=no"; }
            if (Resizable) { JScript += ",menubar=yes"; } else { JScript += ",toolbar=no"; }

            #endregion
            JScript += "')";
            //JScript += "') </script>";

            ScriptManager.RegisterStartupScript(curPage, curPage.GetType(), "popup_window", JScript, true);
        }

        #endregion

        #region Display Alert

        public static void displayAlert(Page curPage, string msg)
        {
            msg = msg.Replace("'", @"\'");
            //ScriptManager.RegisterStartupScript(curPage, curPage.GetType(), "err_msg", "alert('" + msg + "');", true);
            //string t = "$.alert({ icon:'fa fa-cog',type:'blue', " +
            //    "animation: 'scale', title:'Information',content: '" + msg.Replace("\\n","<br/>") + "'});";
            string t = "$.alert({ icon:'fa fa-exclamation-circle', type:'blue', " +
                "animation: 'scale', title:'',content: '" + msg.Replace("\\n", "<br/>") + "'});";
            ScriptManager.RegisterStartupScript(curPage, curPage.GetType(), "err_msg", t, true);
        }

        public static void displayAlert(Page curPage, string msg, string URL)
        {
            msg = msg.Replace("'", @"\'");
            //string t = "$.confirm({icon:'fa fa-cog',type:'blue', " +
            //    "animation: 'scale',title: 'Information', content: '" + msg.Replace("\\n", "<br/>") + 
            //    "',autoClose: 'redirectPage|5000',buttons:{redirectPage:{text: 'Redirecting in',action: function() {window.location.href = '" + URL + "'}}}});";
            string t = "$.confirm({icon:'fa fa-exclamation-circle',type:'blue', " +
                "animation: 'scale',title: '', content: '" + msg.Replace("\\n", "<br/>") +
                "',autoClose: 'redirectPage|5000',buttons:{redirectPage:{text: 'Redirecting in',action: function() {window.location.href = '" + URL + "'}}}});";
            ScriptManager.RegisterStartupScript(curPage, curPage.GetType(), "err_msg", t, true);
        }

        public static void displayAlert(Page curPage, string msg, string URL, string urlParameter)
        {
            ScriptManager.RegisterStartupScript(curPage, curPage.GetType(), "err_msg", "alert('" + msg + "'); window.location.href = '" + URL + "?" + urlParameter + "=" + encryptURL(decryptURL(HttpContext.Current.Request[urlParameter].ToString())) + "';", true);
        }


        #endregion

        #region Other Function

        public static string decryptURL(string str)
        {
            string returnValue = "";

            try
            {
                returnValue = secure.Decrypt(secure.DURC(str), true);
            }
            catch (Exception ex) { LogUtil.logError(ex.ToString(), "Err Decrypt - " + str); }

            return returnValue;
        }

        public static string encryptURL(string str)
        {
            string returnValue = "";

            try
            {
                returnValue = secure.EURC(secure.Encrypt(str, true));
            }
            catch (Exception ex) { LogUtil.logError(ex.ToString(), "Err Encrypt - " + str); }

            return returnValue;
        }

        public static string randomGenerator(int returnDigitCount, string randomCharacters, bool encrypt)
        {
            Random rnd = new Random();
            string pass = "";
            for (int i = 0; i < returnDigitCount; i++)
                pass += randomCharacters.Substring(rnd.Next(randomCharacters.Length), 1);

            if (encrypt)
                return secure.Encrypt(pass, true);
            else
                return pass;
        }

        public static string randomGenerator(int returnDigitCount, string randomCharacters, bool encrypt, string table, string column, string specialWord)
        {
            Random rnd = new Random();
            string pass = "";
            bool fail = true;
            wwdb db = new wwdb();
            string sql = "";

            try
            {
                do
                {
                    pass = "";

                    for (int i = 0; i < returnDigitCount; i++)
                        pass += randomCharacters.Substring(rnd.Next(randomCharacters.Length), 1);

                    sql = " SELECT 1 FROM " + secure.RC(table) + " WITH (NOLOCK) WHERE " + secure.RC(column) + " = N'" + secure.RC(specialWord + pass) + "'; ";
                    db.OpenTable(sql);

                    if (db.RecordCount() == 0)
                        fail = false;

                } while (fail);
            }
            catch (Exception ex)
            {
                LogUtil.logError(ex.ToString(), sql);
            }
            finally
            {
                db.Close();
            }

            if (encrypt)
                return secure.Encrypt(specialWord + pass, true);
            else
                return specialWord + pass;
        }

        #endregion

        #region Search Function Part
        public static string searchTextBox(string columnName, TextBox textBox, bool isLike, bool addAnd, bool addOr)
        {
            if (textBox.Text.Trim() != string.Empty)
            {
                if (addAnd && isLike)
                    return " AND " + columnName + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                else if (addOr && isLike)
                    return " OR " + columnName + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                else if (isLike & !addAnd && !addOr)
                    return columnName + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                else if (addAnd && !isLike)
                    return " AND " + columnName + " = N'" + secure.RC(textBox.Text) + "' ";
                else if (addOr && !isLike)
                    return " OR " + columnName + " = N'" + secure.RC(textBox.Text) + "' ";
                else if (!addAnd && !addOr && !isLike)
                    return columnName + " = N'" + secure.RC(textBox.Text) + "' ";
            }

            return "";
        }

        /// <summary>
        /// Condition 1 (AND LIKE), 2 (OR LIKE), 3 (LIKE), 4 (AND =) 5 (OR =), 6 (=), 7 (AND NOT LIKE), 8 (OR NOT LIKE), 9 (NOT LIKE), 10 (AND !=), 11 (OR !=), 12 (!=)
        /// </summary>
        /// <param name="columnName"></param>
        /// <param name="textBox"></param>
        /// <param name="condition"></param>
        /// <param name="addAnd"></param>
        /// <param name="addOr"></param>
        /// <returns></returns>
        public static string searchTextBox(string[] columnName, TextBox textBox, int[] condition, bool addAnd, bool addOr)
        {
            string str = "";

            if (textBox.Text.Trim() != string.Empty)
            {
                if (addAnd)
                    str = " AND ( ";
                else if (addOr)
                    str = " OR ( ";
                else
                    str = " ( ";

                for (int a = 0; a < columnName.Length; a++)
                {
                    if (condition[a] == 1)
                    {
                        str += " AND " + columnName[a] + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 2)
                    {
                        str += " OR " + columnName[a] + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 3)
                    {
                        str += columnName[a] + " LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 4)
                    {
                        str += " AND " + columnName[a] + " = N'" + secure.RC(textBox.Text) + "' ";
                    }
                    else if (condition[a] == 5)
                    {
                        str += " OR " + columnName[a] + " = N'" + secure.RC(textBox.Text) + "' ";
                    }
                    else if (condition[a] == 6)
                    {
                        str += columnName[a] + " = N'" + secure.RC(textBox.Text) + "' ";
                    }
                    if (condition[a] == 7)
                    {
                        str += " AND " + columnName[a] + " NOT LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 8)
                    {
                        str += " OR " + columnName[a] + " NOT LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 9)
                    {
                        str += columnName[a] + " NOT LIKE N'%" + secure.RC(textBox.Text) + "%' ";
                    }
                    else if (condition[a] == 10)
                    {
                        str += " AND " + columnName[a] + " <> N'" + secure.RC(textBox.Text) + "' ";
                    }
                    else if (condition[a] == 11)
                    {
                        str += " OR " + columnName[a] + " <> N'" + secure.RC(textBox.Text) + "' ";
                    }
                    else if (condition[a] == 12)
                    {
                        str += columnName[a] + " <> N'" + secure.RC(textBox.Text) + "' ";
                    }
                }
                str += " ) ";
            }

            return str;
        }

        //Before 2012-09-26
        /// <summary>
        /// If isValidate is true then will validate SelectedIndex != 0 
        /// If addAnd is true then will add AND at in front of string
        /// If addOr is true then will add OR at in front of string
        /// If addAnd and addOr are false then nothing will be add
        /// </summary>
        /// <param name="columnName"></param>
        /// <param name="ddlList"></param>
        /// <param name="isValidate"></param>
        /// <param name="addAnd"></param>
        /// <param name="addOr"></param>
        /// <returns></returns>
        public static string searchDropDownList(string columnName, DropDownList ddlList, bool isValidate, bool addAnd, bool addOr)
        {
            if (isValidate)
            {
                if (ddlList.SelectedIndex != 0)
                {
                    if (addAnd)
                        return " AND " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                    else if (addOr)
                        return " OR " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                    else if (!addAnd && !addOr)
                        return " WHERE " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                }
                else
                {

                    // validate only for AnnouncementStatus in AnnouncementList.aspx
                    if (columnName == "a.announcementstatus" && ddlList.ID == "ddlAnnouncementStatus")
                    {
                        if (ddlList.SelectedValue != "-")
                        {
                            if (addAnd)
                                return " AND " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                            else if (addOr)
                                return " OR " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                            else if (!addAnd && !addOr)
                                return " WHERE " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                        }

                    }
                }
            }
            else
            {
                if (addAnd)
                    return " AND " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                else if (addOr)
                    return " OR " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
                else if (!addAnd && !addOr)
                    return " WHERE " + columnName + " = N'" + secure.RC(ddlList.SelectedValue.ToString()) + "' ";
            }

            return "";
        }

        public static string searchCheckBox(string columnName, CheckBoxList cblList, bool addAnd, bool addOr)
        {
            StringBuilder sql = new StringBuilder();

            for (int a = 0; a < cblList.Items.Count; a++)
            {
                if (cblList.Items[a].Selected)
                {
                    if (sql.ToString().Trim() != string.Empty)
                    {
                        sql.Append(" OR " + columnName + " = N'" + secure.RC(cblList.Items[a].Value) + "' ");
                    }
                    else
                    {
                        sql.Append(" ( " + columnName + " = N'" + secure.RC(cblList.Items[a].Value) + "' ");
                    }
                }
            }

            if (sql.ToString().Trim() != string.Empty)
            {
                if (addAnd)
                    return " AND " + sql.ToString() + " ) ";
                else if (addOr)
                    return " OR " + sql.ToString() + " ) ";
                else if (!addAnd && !addOr)
                    return " WHERE " + sql.ToString() + " ) ";
                else
                    return "";
            }
            else
                return "";
        }

        public static string searchCheckBox(string columnName, CheckBoxList cblList, bool addAnd, bool addOr, out bool result)
        {
            result = false;

            StringBuilder sql = new StringBuilder();

            for (int a = 0; a < cblList.Items.Count; a++)
            {
                if (cblList.Items[a].Selected)
                {
                    result = true;

                    if (sql.ToString().Trim() != string.Empty)
                    {
                        sql.Append(" OR " + columnName + " = N'" + secure.RC(cblList.Items[a].Value) + "' ");
                    }
                    else
                    {
                        sql.Append(" ( " + columnName + " = N'" + secure.RC(cblList.Items[a].Value) + "' ");
                    }
                }
            }

            if (sql.ToString().Trim() != string.Empty)
            {
                if (addAnd)
                    return " AND " + sql.ToString() + " ) ";
                else if (addOr)
                    return " OR " + sql.ToString() + " ) ";
                else if (!addAnd && !addOr)
                    return " WHERE " + sql.ToString() + " ) ";
                else
                    return "";
            }
            else
                return "";
        }

        #endregion

        public static string sha256(string text)
        {
            SHA256Managed crypt = new SHA256Managed();
            string hash = String.Empty;
            byte[] crypto = crypt.ComputeHash(Encoding.UTF8.GetBytes(text), 0, Encoding.UTF8.GetByteCount(text));
            foreach (byte bit in crypto)
            {
                hash += bit.ToString("x2");
            }
            return hash;
        }

        public static string sha1(string input)
        {
            using (SHA1Managed sha1 = new SHA1Managed())
            {
                var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
                var sb = new StringBuilder(hash.Length * 2);

                foreach (byte b in hash)
                {
                    // can be "x2" if you want lowercase
                    sb.Append(b.ToString("X2"));
                }

                return sb.ToString();
            }
        }

        public static string changeLanguage(string word)
        {
            object x = HttpContext.GetGlobalResourceObject("Language", word);

            if (x == null)
                return word;
            else
                return x.ToString();

        }

        public static string changeCountryLanguage(string word)
        {
            object x = HttpContext.GetGlobalResourceObject("Country", word);

            if (x == null)
                return word;
            else
                return x.ToString();

        }

    }

}