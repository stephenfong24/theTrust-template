using LoggerUtil;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Text;

namespace Util
{
    public class wwdb
    {
        private DataTable _Datatable;
        private int timeOut = 14400;

        public DataTable Datatable
        {
            get { return _Datatable; }
            set { _Datatable = value; }
        }
        private SqlDataAdapter adData;
        private SqlCommand Cmd;

        public SqlCommand SQLCmd
        {
            get { return Cmd; }
            set { Cmd = value; }
        }
        public SqlConnection conn;
        public string ErrorMessage;
        public bool HasError = false;
        private int iRow = 0;
        private SqlTransaction Trans;
        public bool UseTransaction = false;
        public int SqlErrorCode = 0;



        public wwdb()
        {
            AppSettingsReader reader = new AppSettingsReader();
            string cipherString = (string) reader.GetValue("msSQL", typeof(string));
            cipherString = secure.Decrypt(cipherString, true);
            try
            {
                this.HasError = false;
                this.conn = new SqlConnection(cipherString);
                this.conn.Open();
            }
            catch (Exception exception)
            {
                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }
        }

        public void BeginTransaction()
        {
            this.Trans = this.conn.BeginTransaction(IsolationLevel.ReadCommitted);
            this.UseTransaction = true;
        }

        public bool Bof()
        {
            return (this.iRow == 0);
        }

        public void Close()
        {
            if (this.conn != null)
            {
                if (this.conn.State == System.Data.ConnectionState.Open)
                {
                    this.conn.Close();
                    this.conn.Dispose();
                    this.conn = null;
                }
            }
        }

        public void CommitTransaction()
        {
            this.Trans.Commit();
            this.UseTransaction = false;
        }

        public DataTable Datasource()
        {
            return this._Datatable;
        }

        public bool Eof()
        {
            try
            {
                return (this.iRow == this._Datatable.Rows.Count);
            }
            catch (Exception)
            {
                return true;
            }
        }

        public bool Execute(string strSQL)
        {
            this.Cmd = new SqlCommand();
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }
            this.Cmd.CommandText = strSQL;
            this.Cmd.CommandTimeout = timeOut;
            this.Cmd.Connection = this.conn;
            this.HasError = false;
            try
            {
                this.Cmd.ExecuteNonQuery();
            }
            catch(SqlException sqlEx)
            {
                this.ErrorMessage = sqlEx.Message;
                this.SqlErrorCode = sqlEx.Number;
                TextFileLogger.LogToFile("wwdb - Execute - Message", sqlEx.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", sqlEx.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);

                LogUtil.logAction(strSQL, "Execute");
                this.HasError = true;
                
            }
            catch (Exception exception)
            {
                this.ErrorMessage = exception.Message;
                TextFileLogger.LogToFile("wwdb - Execute - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);
                this.HasError = true;
                
            }
            this.Cmd = null;
            return !this.HasError;
        }

        //public bool BulkInsertTranUpdate(List<TransactionObject> tr, DataTable dt)
        //{
        //    //Bulk insert into table
        //    foreach (var arr in tr)
        //    {
        //        DataRow dr = dt.NewRow();
        //        dr["CP_EventID"] = arr.CP_EventID;
        //        dr["CP_TransactionID"] = arr.CP_TransactionID;
        //        dr["CP_Timestamp"] = arr.CP_Timestamp;
        //        dr["CP_UserID"] = arr.CP_UserID;
        //        dr["CP_CreatedBy"] = arr.CP_CreatedBy;
        //        dr["WalletAddress"] = arr.WalletAddress;
        //        dr["TransactionType"] = arr.TransactionType;
        //        dr["AmountComm"] = arr.AmountComm;
        //        dr["AmountFrozen"] = arr.AmountFrozen;
        //        dr["AmountLoss"] = arr.AmountLoss;
        //        dr["AmountWin"] = arr.AmountWin;
        //        dr["Remark"] = arr.Remark;
        //        dt.Rows.Add(dr);
        //    }

        //    SqlTransaction trans = this.conn.BeginTransaction();
        //    using (var bulkCopy = new SqlBulkCopy(this.conn, SqlBulkCopyOptions.Default, trans))
        //    {

        //        bulkCopy.DestinationTableName = "dbo.tbl_log_UpdateTran";

        //        try
        //        {
        //            // Write from the source to the destination.
        //            bulkCopy.ColumnMappings.Add("CP_EventID", "CP_EventID");
        //            bulkCopy.ColumnMappings.Add("CP_TransactionID", "CP_TransactionID");
        //            bulkCopy.ColumnMappings.Add("CP_Timestamp", "CP_Timestamp");
        //            bulkCopy.ColumnMappings.Add("CP_CreatedBy", "CP_CreatedBy");
        //            bulkCopy.ColumnMappings.Add("CP_UserID", "CP_UserID");
        //            bulkCopy.ColumnMappings.Add("WalletAddress", "WalletAddress");
        //            bulkCopy.ColumnMappings.Add("TransactionType", "TransactionType");
        //            bulkCopy.ColumnMappings.Add("AmountFrozen", "AmountFrozen");
        //            bulkCopy.ColumnMappings.Add("AmountWin", "AmountWin");
        //            bulkCopy.ColumnMappings.Add("AmountLoss", "AmountLoss");
        //            bulkCopy.ColumnMappings.Add("AmountComm", "AmountComm");
        //            bulkCopy.ColumnMappings.Add("Remark", "Remark");
        //            bulkCopy.WriteToServer(dt);
                        
        //            trans.Commit();
        //            bulkCopy.Close();
        //        }
        //        catch (Exception ex)
        //        {
        //            trans.Rollback();
        //            LogUtil.logError(ex.Message, "BulkInsertTranUpdate");
        //            return false;
        //        }
        //        finally
        //        {
        //            bulkCopy.Close();
        //        }
        //    }
        //    //}

        //    return true;
        //}

        public bool ExecuteSP(string strSQL, DataTable dtDetails)
        {
            this.Cmd = new SqlCommand();
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }
            this.Cmd.CommandText = strSQL;
            this.Cmd.CommandTimeout = timeOut;
            this.Cmd.Connection = this.conn;
            this.HasError = false;

            try
            {
                this.Cmd.CommandType = CommandType.StoredProcedure;
                this.Cmd.Parameters.AddWithValue("@Details", dtDetails);
                this.Cmd.ExecuteNonQuery();
            }
            //try
            //{
            //    //using (SqlCommand cmd = new SqlCommand(strSQL, this.Cmd.Connection))
            //    //{
            //    //    cmd.CommandType = CommandType.StoredProcedure;
            //    //    cmd.Parameters.AddWithValue("@Details", dtDetails);
            //    //    cmd.ExecuteNonQuery();
            //    //}

            //    using (conn)
            //    {
            //        SqlCommand cmd = new SqlCommand(strSQL, conn);
            //        cmd.CommandType = CommandType.StoredProcedure;
            //        SqlParameter tvparam = cmd.Parameters.AddWithValue("@Details", dtDetails);
            //        tvparam.SqlDbType = SqlDbType.Structured;
            //        tvparam.TypeName = "dbo.UpTran";
            //        cmd.ExecuteNonQuery();
            //    }
            //}
            catch (SqlException sqlEx)
            {
                this.SqlErrorCode = sqlEx.Number;
                TextFileLogger.LogToFile("wwdb - Execute - Message", sqlEx.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", sqlEx.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);

                LogUtil.logAction(strSQL, "Execute");
                this.HasError = true;
                this.ErrorMessage = sqlEx.Message;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - Execute - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }
            this.Cmd = null;
            return !this.HasError;

            
        }

        public bool ExecuteSP(string strSQL, string tblName, DataTable dt, string strParameter)
        {
            this.Cmd = new SqlCommand();
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }
            //this.Cmd.CommandText = strSQL;
            //this.Cmd.CommandTimeout = timeOut;
            this.Cmd.Connection = this.conn;
            this.HasError = false;

            

            try
            {
                //using (SqlCommand cmd = new SqlCommand("exec sp_UseStringList @list", con))
                using (SqlCommand cmd = new SqlCommand(strSQL, this.Cmd.Connection))
                {
                    using (var table = new DataTable())
                    {
                        //table.Columns.Add("Item", typeof(string));

                        //for (int i = 0; i < 10; i++)
                        //    table.Rows.Add("Item " + i.ToString());

                        //var pList = new SqlParameter("@list", SqlDbType.Structured);
                        var pList = new SqlParameter(strParameter, SqlDbType.Structured);
                        //pList.TypeName = "dbo.StringList";
                        pList.TypeName = tblName;
                        //pList.Value = table;
                        pList.Value = dt;

                        cmd.Parameters.Add(pList);
                        this.Cmd.ExecuteNonQuery();

                        //using (var dr = cmd.ExecuteReader())
                        //{
                        //    while (dr.Read())
                        //        Console.WriteLine(dr["Item"].ToString());
                        //}
                    }
                }
                //this.Cmd.ExecuteNonQuery();

            }
            catch (SqlException sqlEx)
            {
                this.SqlErrorCode = sqlEx.Number;
                TextFileLogger.LogToFile("wwdb - Execute - Message", sqlEx.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", sqlEx.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);

                LogUtil.logAction(strSQL, "Execute");
                this.HasError = true;
                this.ErrorMessage = sqlEx.Message;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - Execute - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }
            this.Cmd = null;
            return !this.HasError;
        }


        public bool Execute(SqlCommand ExeComm, Boolean Enabled_ExecuteLog = false, Boolean Enabled_ErrorLog = false)
        {
            this.Cmd = ExeComm;
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }

            this.Cmd.Connection = this.conn;
            this.HasError = false;

            try
            {
                if (Enabled_ExecuteLog) { LogUtil.logAction(ExeComm.CommandText, "Execute_NonQuery"); }
                this.Cmd.ExecuteNonQuery();
            }
            catch (Exception exception)
            {
                if (Enabled_ErrorLog) { LogUtil.logError(exception.Message, ExeComm.CommandText); }

                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }

            this.Cmd = null;
            return !this.HasError;
        }

        public object executeScalarSP(string strSQL, SqlParameter[] sqlParams)
        {
            object obj2 = null;
            this.Cmd = new SqlCommand();
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }
            this.Cmd.CommandText = strSQL;
            this.Cmd.CommandTimeout = timeOut;
            this.Cmd.CommandType = CommandType.StoredProcedure;
            this.Cmd.Connection = this.conn;
            this.Cmd.Parameters.AddRange(sqlParams);

            this.HasError = false;
            try
            {
                obj2 = this.Cmd.ExecuteScalar();
            }
            catch(SqlException sqlEx)
            {
                this.SqlErrorCode = sqlEx.Number;
                TextFileLogger.LogToFile("wwdb - Execute - Message", sqlEx.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", sqlEx.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", constructParamsToSQL(strSQL,sqlParams), true);
                this.HasError = true;
                this.ErrorMessage = sqlEx.Message;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - Execute - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Execute - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Execute - SQLQuery", constructParamsToSQL(strSQL, sqlParams), true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }
            this.Cmd = null;
            return obj2;
        }

        public object executeScalar(string strSQL)
        {
            object obj2 = null;
            this.Cmd = new SqlCommand();
            if (this.UseTransaction)
            {
                this.Cmd.Transaction = this.Trans;
            }
            this.Cmd.CommandText = strSQL;
            this.Cmd.CommandTimeout = timeOut;
            this.Cmd.Connection = this.conn;
            this.HasError = false;
            try
            {
                obj2 = this.Cmd.ExecuteScalar();
            }
            catch (SqlException sqlEx)
            {
                this.SqlErrorCode = sqlEx.Number;
                TextFileLogger.LogToFile("wwdb - executeScalar - Message", sqlEx.Message, true);
                TextFileLogger.LogToFile("wwdb - executeScalar - StackTrace", sqlEx.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - executeScalar - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = sqlEx.Message;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - executeScalar - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - executeScalar - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - executeScalar - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
            }
            this.Cmd = null;
            return obj2;
        }

        public void First()
        {
            this.iRow = 0;
        }

        public DataSet getDataSet(string strSQL)
        {
            DataSet set = null;
            DataSet dataSet = null;
            dataSet = new DataSet();
            try
            {
                this.HasError = false;
                this.adData = new SqlDataAdapter(strSQL, this.conn);
                this.adData.SelectCommand.CommandTimeout = timeOut;
                this.adData.Fill(dataSet);
                this.adData = null;
                return dataSet;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - getDataSet - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - getDataSet - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - getDataSet - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
                set = null;
            }
            return set;
        }

        public DataTable getDataTable(string strSQL)
        {
            DataTable table = null;
            DataTable dataTable = new DataTable();
            try
            {
                this.HasError = false;
                this.adData = new SqlDataAdapter(strSQL, this.conn);
                this.adData.SelectCommand.CommandTimeout = timeOut;
                this.adData.Fill(dataTable);
                this.adData = null;
                return dataTable;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - getDataTable - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - getDataTable - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - getDataTable - SQLQuery", strSQL, true);
                this.HasError = true;
                this.ErrorMessage = exception.Message;
                table = null;
            }
            return table;
        }

        public string Item(string sItem)
        {
            try
            {
                return this._Datatable.Rows[this.iRow][sItem].ToString().Trim();
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - Item - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Item - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Item - Item", sItem, true);
                return "";
            }
        }

        public string Item(int row, string sItem)
        {
            try
            {
                return this._Datatable.Rows[row][sItem].ToString().Trim();
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - Item - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - Item - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - Item - Item", sItem, true);
                return "";
            }
        }

        public void Last()
        {
            this.iRow = this._Datatable.Rows.Count - 1;
        }

        public void MoveNext()
        {
            this.iRow++;
        }

        public void MovePrevious()
        {
            if (this.iRow != 0)
            {
                this.iRow--;
            }
        }

        public void OpenTable(string strsql)
        {
            this.iRow = 0;
            this._Datatable = null;
            this._Datatable = new DataTable();
            try
            {
                this.HasError = false;
                this.adData = new SqlDataAdapter(strsql, this.conn);
                if (this.UseTransaction)
                {
                    this.adData.SelectCommand.Transaction = this.Trans;
                }
                this.adData.SelectCommand.CommandTimeout = timeOut;
                this.adData.Fill(this._Datatable);
                this.adData = null;
            }
            catch (Exception exception)
            {
                TextFileLogger.LogToFile("wwdb - OpenTable - Message", exception.Message, true);
                TextFileLogger.LogToFile("wwdb - OpenTable - StackTrace", exception.StackTrace, true);
                TextFileLogger.LogToFile("wwdb - OpenTable - SQLQuery", strsql, true);
                this.ErrorMessage = exception.Message;
                this.HasError = true;
                
            }
        }

        public int RecordCount()
        {
            return this._Datatable.Rows.Count;
        }

        public void Rollback()
        {
            this.Trans.Rollback();
            this.UseTransaction = false;
        }

        public enum DataType
        {
            adVarChar,
            adInteger,
            adFloat,
            adDateTime,
            adNVarChar
        }

        public enum Direction
        {
            adInput,
            adOutput
        }

        private string constructParamsToSQL(string sql, SqlParameter[] Sqlparams)
        {
            StringBuilder sb = new StringBuilder();
            sb.Append(sql).Append(" ");
            foreach (SqlParameter sqlparam in Sqlparams)
            { 
                sb.AppendFormat(" @{0}=N'{1}',",sqlparam.ParameterName,sqlparam.Value);
            }
            return sb.ToString().TrimEnd(',');
        }
    }
}

