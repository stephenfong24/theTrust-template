USE [Sandbox_Legacy]
GO
/****** Object:  Table [dbo].[MemberHierarchyViewC]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MemberHierarchyViewC](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ParentID] [bigint] NULL,
	[MemberID] [bigint] NULL,
	[ParentLevel] [int] NULL,
 CONSTRAINT [PK_MemberHierarchyViewC] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MemberHierarchyViewC_Trust]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MemberHierarchyViewC_Trust](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ParentID] [bigint] NULL,
	[MemberID] [bigint] NULL,
	[ParentLevel] [int] NULL,
 CONSTRAINT [PK_MemberHierarchyViewC_Trust] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[MemberHierarchyViewC_Will]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[MemberHierarchyViewC_Will](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ParentID] [bigint] NULL,
	[MemberID] [bigint] NULL,
	[ParentLevel] [int] NULL,
 CONSTRAINT [PK_MemberHierarchyViewC_Will] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_2Fa]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_2Fa](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[TransDate] [datetime] NOT NULL,
	[ActiveDate] [datetime] NULL,
	[SecretKey] [nvarchar](500) NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_2Fa] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_AgentRank]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_AgentRank](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[RankName] [nvarchar](200) NOT NULL,
	[RankCode] [varchar](50) NOT NULL,
	[Ranking] [int] NOT NULL,
	[IsAutoRankEligible] [bit] NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_AgentRank] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_AgentRankingHistory]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_AgentRankingHistory](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Type] [varchar](10) NOT NULL,
	[PreviousRanking] [int] NOT NULL,
	[NewRanking] [int] NOT NULL,
	[PreviousAdvanceRanking] [int] NOT NULL,
	[NewAdvanceRanking] [int] NOT NULL,
	[PreviousEffectiveRanking] [int] NOT NULL,
	[NewEffectiveRanking] [int] NOT NULL,
	[ChangeType] [varchar](20) NOT NULL,
	[ChangeSource] [varchar](30) NOT NULL,
	[PersonalSales] [decimal](18, 2) NULL,
	[DirectTMOrAbove] [int] NULL,
	[DirectTDOrAbove] [int] NULL,
	[DirectGTDOrAbove] [int] NULL,
	[RankingYear] [int] NULL,
	[ProcessingDate] [date] NULL,
	[PassNo] [int] NULL,
	[ChangedBy] [bigint] NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK_tbl_AgentRankingHistory] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_ApiRequestLog]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_ApiRequestLog](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[RequestID] [uniqueidentifier] NOT NULL,
	[RequestTime] [datetime] NOT NULL,
	[ResponseTime] [datetime] NULL,
	[DurationMs] [int] NULL,
	[UserID] [varchar](50) NULL,
	[MerchantID] [varchar](50) NULL,
	[HttpMethod] [varchar](10) NULL,
	[RequestUrl] [nvarchar](1000) NULL,
	[ControllerName] [nvarchar](200) NULL,
	[ActionName] [nvarchar](200) NULL,
	[IpAddress] [varchar](50) NULL,
	[UserAgent] [nvarchar](1000) NULL,
	[RequestHeaders] [nvarchar](max) NULL,
	[RequestBody] [nvarchar](max) NULL,
	[ResponseStatusCode] [int] NULL,
	[ResponseBody] [nvarchar](max) NULL,
	[ActivityTitle] [nvarchar](150) NULL,
	[Description] [nvarchar](300) NULL,
	[IsSuccess] [bit] NULL,
	[ExceptionMessage] [nvarchar](max) NULL,
	[CreatedAt] [datetime] NOT NULL,
 CONSTRAINT [PK__tbl_ApiR__FFEE74512A14DD8E] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_AppToken]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_AppToken](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[token] [varchar](255) NULL,
	[lastTxnDate] [datetime] NULL,
	[ExpiredDate] [datetime] NULL,
 CONSTRAINT [PK_tbl_AppToken] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Bank_Account_Type]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Bank_Account_Type](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[BankAccountType_Code] [varchar](50) NOT NULL,
	[BankAccountType_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Bank_Account_Type] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_ChecksumBalance]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_ChecksumBalance](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NULL,
	[PointType] [int] NULL,
	[type] [varchar](500) NULL,
	[Remark] [varchar](50) NULL,
	[TransDate] [datetime] NULL,
 CONSTRAINT [PK_tbl_ChecksumBalance] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Config_General]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Config_General](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[Clause_Amount] [decimal](18, 2) NOT NULL,
	[SST] [decimal](18, 2) NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_Config_General] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Config_Sms]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Config_Sms](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ServiceName] [nvarchar](50) NOT NULL,
	[ApiKey] [nvarchar](50) NOT NULL,
	[SecretKey] [nvarchar](200) NOT NULL,
	[Balance] [decimal](18, 8) NOT NULL,
	[LastUpdateDate] [datetime] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Config_Sms] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Country]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Country](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[Country_Name] [nvarchar](255) NULL,
	[Country_Domain] [nvarchar](5) NULL,
	[Country_Status] [smallint] NULL,
	[Country_MobileCode] [int] NULL,
	[Country_Nationality] [nvarchar](50) NULL,
	[Currency_Code] [nvarchar](50) NULL,
	[Currency_Name] [nvarchar](50) NULL,
	[Currency_Display] [decimal](12, 3) NULL,
	[Currency_Actual_In] [decimal](12, 3) NULL,
	[Currency_Actual_Out] [decimal](12, 3) NULL,
	[Currency_Length] [int] NULL,
	[Currency_Web_Format] [varchar](10) NULL,
	[Currency_DB_Format] [varchar](10) NULL,
	[Currency_BankCharges] [decimal](12, 3) NULL,
 CONSTRAINT [aaaaamlm_country_PK] PRIMARY KEY NONCLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Current_Login]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Current_Login](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[user_session] [nvarchar](250) NULL,
	[member_code] [nvarchar](500) NULL,
	[login_time] [datetime] NULL,
	[last_activity] [datetime] NULL,
	[current_page] [nvarchar](500) NULL,
	[user_ip] [nvarchar](50) NULL,
 CONSTRAINT [PK_tbl_current_login] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_EmailQueue]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_EmailQueue](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[PublicID] [nvarchar](255) NOT NULL,
	[JobType] [nvarchar](20) NOT NULL,
	[ReceiverEmail] [nvarchar](255) NOT NULL,
	[Subject] [nvarchar](500) NOT NULL,
	[TemplateCode] [nvarchar](100) NOT NULL,
	[TemplateDataJson] [nvarchar](max) NOT NULL,
	[Status] [int] NOT NULL,
	[RetryCount] [int] NOT NULL,
	[ErrorMessage] [datetime] NULL,
	[CreatedDate] [datetime] NOT NULL,
	[ProcessingDate] [datetime] NULL,
	[SentDate] [datetime] NULL,
 CONSTRAINT [PK_tbl_EmailQueue] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_EmailVerification]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_EmailVerification](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[Expired] [datetime] NOT NULL,
	[UniqueID] [nvarchar](200) NOT NULL,
	[Signature] [nvarchar](200) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
	[IP] [nvarchar](500) NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_EmailVerification] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_FileUploadAudit]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_FileUploadAudit](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NULL,
	[MemberID] [bigint] NULL,
	[ModuleCode] [varchar](50) NULL,
	[UploadType] [varchar](50) NULL,
	[OriginalFileName] [nvarchar](255) NULL,
	[StoredFileName] [nvarchar](255) NULL,
	[FileExtension] [varchar](20) NULL,
	[ContentType] [varchar](100) NULL,
	[FileSize] [bigint] NULL,
	[SHA256] [varchar](64) NULL,
	[ScanStatus] [int] NOT NULL,
	[ScanCode] [varchar](50) NULL,
	[ScanMessage] [nvarchar](500) NULL,
	[AntivirusExitCode] [int] NULL,
	[FileUrl] [nvarchar](500) NULL,
	[UploadedFile] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Funeral_Method]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Funeral_Method](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Funeral_Code] [varchar](50) NOT NULL,
	[Funeral_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Funeral_Method] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_action]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_action](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[action_sql] [nvarchar](max) NULL,
	[action_type] [nvarchar](max) NULL,
	[action_loginID] [nvarchar](100) NULL,
	[action_datetime] [datetime] NULL,
	[action_ip] [nvarchar](50) NULL,
	[action_browser] [nvarchar](200) NULL,
	[action_browser_version] [nvarchar](150) NULL,
 CONSTRAINT [PK_tbl_log_action] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_ChangePassword]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_ChangePassword](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[ChangeFrom] [varchar](50) NOT NULL,
	[ChangeType] [varchar](50) NOT NULL,
	[OldPass] [nvarchar](100) NOT NULL,
	[NewPass] [nvarchar](100) NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[IP] [nvarchar](500) NULL,
 CONSTRAINT [PK_tbl_log_ChangePassword] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_error]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_error](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[error_message] [nvarchar](max) NULL,
	[error_sql] [nvarchar](max) NULL,
	[error_rawurl] [nvarchar](max) NULL,
	[error_loginid] [nvarchar](100) NULL,
	[error_datetime] [datetime] NULL,
	[error_ip] [nvarchar](50) NULL,
	[error_browser] [nvarchar](200) NULL,
	[error_browser_version] [nvarchar](150) NULL,
 CONSTRAINT [PK_tbl_log_error] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_FileUpload]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_FileUpload](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[PublicID] [uniqueidentifier] NOT NULL,
	[UploadedFile] [nvarchar](1000) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ExpiredAt] [datetime] NOT NULL,
	[MemberID] [bigint] NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_FileUpload] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_login]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_login](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[log_user] [nvarchar](500) NULL,
	[log_userId] [bigint] NULL,
	[log_ip] [nvarchar](500) NULL,
	[log_sessionId] [nvarchar](500) NULL,
	[log_action] [nvarchar](500) NULL,
	[log_pwdAttempt] [nvarchar](500) NULL,
	[log_browser] [nvarchar](500) NULL,
	[log_version] [nvarchar](500) NULL,
	[log_datetime] [datetime] NULL,
	[log_credit] [int] NOT NULL,
	[log_clearcredit] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_login] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_Registration]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_Registration](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NULL,
	[MemberID] [bigint] NOT NULL,
	[SponsorID] [bigint] NOT NULL,
	[Username] [nvarchar](250) NOT NULL,
	[Ranking] [int] NOT NULL,
	[IP] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_Registration] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_SecurityAttemp]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_SecurityAttemp](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[log_user] [nvarchar](500) NULL,
	[log_userId] [bigint] NULL,
	[log_ip] [nvarchar](500) NULL,
	[log_sessionId] [nvarchar](500) NULL,
	[log_action] [nvarchar](500) NULL,
	[log_actionType] [nvarchar](100) NULL,
	[log_valAttempt] [nvarchar](500) NULL,
	[log_browser] [nvarchar](500) NULL,
	[log_version] [nvarchar](500) NULL,
	[log_datetime] [datetime] NULL,
	[log_credit] [int] NOT NULL,
	[log_clearcredit] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_SecurityAttemp] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_securityPassAttemp]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_securityPassAttemp](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[log_user] [nvarchar](500) NULL,
	[log_userId] [bigint] NULL,
	[log_ip] [nvarchar](500) NULL,
	[log_sessionId] [nvarchar](500) NULL,
	[log_action] [nvarchar](500) NULL,
	[log_pwdAttempt] [nvarchar](500) NULL,
	[log_browser] [nvarchar](500) NULL,
	[log_version] [nvarchar](500) NULL,
	[log_datetime] [datetime] NULL,
	[log_credit] [int] NOT NULL,
	[log_clearcredit] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_securityPassAttemp] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_SendMail]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_SendMail](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[Templete] [varchar](300) NOT NULL,
	[ActionType] [varchar](300) NOT NULL,
	[RefID] [bigint] NOT NULL,
	[Remark] [nvarchar](500) NOT NULL,
	[Status] [int] NOT NULL,
	[Ip] [varchar](50) NOT NULL,
	[WalletType] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_log_SendMail] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_sql]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_sql](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[sqlString] [nvarchar](max) NULL,
	[fromURL] [nvarchar](500) NULL,
	[loginID] [nvarchar](50) NULL,
	[createdAt] [datetime] NULL,
 CONSTRAINT [PK_tbl_log_sql] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_log_TacAttemp]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_log_TacAttemp](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[log_user] [nvarchar](500) NULL,
	[log_userId] [bigint] NULL,
	[log_ip] [nvarchar](500) NULL,
	[log_sessionId] [nvarchar](500) NULL,
	[log_action] [nvarchar](500) NULL,
	[log_tacAttempt] [nvarchar](500) NULL,
	[log_browser] [nvarchar](500) NULL,
	[log_version] [nvarchar](500) NULL,
	[log_datetime] [datetime] NULL,
	[log_credit] [int] NOT NULL,
	[log_clearcredit] [int] NOT NULL,
 CONSTRAINT [PK_tbl_log_TacAttemp] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Login]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Login](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NULL,
	[LoginPassword] [nvarchar](100) NULL,
	[SecondaryPassword] [nvarchar](100) NULL,
	[LastTimeLogin] [datetime] NULL,
	[LastLoginIP] [nvarchar](500) NULL,
	[LoginStatus] [bit] NULL,
	[LoginRole] [varchar](50) NULL,
	[login_langcode] [varchar](10) NULL,
	[FirstLogin] [bit] NULL,
	[renewalDate] [datetime] NULL,
	[BlockedAt] [datetime] NULL,
	[ReactiveAt] [datetime] NULL,
 CONSTRAINT [PK_tbl_Login] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_loginAttempt]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_loginAttempt](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[log_user] [nvarchar](100) NULL,
	[log_ip] [nvarchar](100) NULL,
	[log_datetime] [datetime] NULL,
	[isDeleted] [bit] NULL,
 CONSTRAINT [PK_tbl_loginAttempt] PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Master_BankList]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Master_BankList](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Country] [nvarchar](255) NULL,
	[Country_Domain] [nvarchar](5) NULL,
	[Currency] [varchar](50) NULL,
	[BankName] [varchar](50) NOT NULL,
	[BankNameDetail] [nvarchar](100) NOT NULL,
	[ShowOption] [varchar](50) NOT NULL,
	[OperateMethod] [varchar](50) NULL,
	[Status] [int] NOT NULL,
	[ImgPath] [nvarchar](max) NULL,
	[NoticeImg] [nvarchar](max) NULL,
	[IsDeposit] [int] NOT NULL,
	[IsWithdrawal] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Master_BankList] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberBalance]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberBalance](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Cash] [decimal](18, 8) NULL,
	[CreatedAt] [datetime] NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_MemberBalance] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC,
	[MemberID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberControl]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberControl](
	[RowID] [int] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NULL,
	[ChangePass] [int] NOT NULL,
	[ChangeSecurePass] [int] NOT NULL,
	[ChangeProfile] [int] NOT NULL,
	[ChangeBank] [int] NOT NULL,
	[Email_Verification_Status] [int] NOT NULL,
	[KYC_Verification_Status] [int] NOT NULL,
	[Comm] [decimal](18, 2) NOT NULL,
	[TrustAccess] [int] NOT NULL,
	[WillAccess] [int] NOT NULL,
	[AllowTrustOverridingCommission] [bit] NOT NULL,
 CONSTRAINT [PK_tbl_MemberControl] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberInfo]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberInfo](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[displayName] [nvarchar](100) NULL,
	[Username] [nvarchar](250) NULL,
	[Fullname] [nvarchar](100) NULL,
	[UserType] [varchar](50) NULL,
	[Package] [int] NULL,
	[Ranking] [int] NULL,
	[AdvanceRanking] [int] NULL,
	[IC_Type] [varchar](50) NULL,
	[IC] [varchar](50) NULL,
	[Email] [nvarchar](250) NULL,
	[CountryMobileCode] [varchar](10) NULL,
	[Mobile] [varchar](25) NULL,
	[DOB] [date] NULL,
	[Address_1] [nvarchar](300) NULL,
	[Address_2] [nvarchar](300) NULL,
	[City] [nvarchar](300) NULL,
	[State] [varchar](50) NULL,
	[Postcode] [varchar](50) NULL,
	[Country_Domain] [nvarchar](5) NULL,
	[Country] [nvarchar](50) NULL,
	[Occupation] [nvarchar](150) NULL,
	[TinNumber] [nvarchar](50) NULL,
	[Currency] [varchar](50) NULL,
	[AccType] [varchar](25) NULL,
	[Status] [int] NULL,
	[ActivationDate] [datetime] NULL,
	[IsDeleted] [bit] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[RefID] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_MemberInfo] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberInfo_Avatar]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberInfo_Avatar](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[FielUrl] [nvarchar](500) NOT NULL,
	[Avatar] [nvarchar](500) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_MemberInfo_Avatar] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberInfo_Bank]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberInfo_Bank](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[AccountName] [nvarchar](100) NOT NULL,
	[AccountNumber] [nvarchar](50) NOT NULL,
	[BankName] [nvarchar](150) NOT NULL,
	[BankBranch] [nvarchar](255) NULL,
	[SwiftCode] [nvarchar](50) NULL,
	[IBAN] [nvarchar](50) NULL,
	[BankCountry] [nvarchar](50) NULL,
	[WalletAddress] [varchar](50) NULL,
	[IsDeleted] [int] NULL,
	[CreatedBy] [bigint] NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
 CONSTRAINT [PK_tbl_MemberInfo_Bank] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberInfo_KYC]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberInfo_KYC](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[DocumentType] [varchar](50) NOT NULL,
	[FileUrl] [nvarchar](500) NOT NULL,
	[UploadedFile] [nvarchar](500) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_MemberInfo_KYC] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberUnit]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberUnit](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[memberID] [int] NOT NULL,
	[unitID] [int] NULL,
	[unitSponsor] [int] NULL,
	[sponsorIndex] [varchar](4000) NULL,
	[levelx] [int] NULL,
	[unitPosition] [varchar](50) NULL,
	[unitUpline] [int] NULL,
	[uplineIndex] [varchar](4000) NULL,
	[levelfx] [int] NULL,
	[node] [int] NULL,
	[placementtype] [char](1) NULL,
	[isActivated] [bit] NULL,
	[isDeleted] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[CreatedBy] [varchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_MemberUnit_1] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC,
	[memberID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberUnit_Trust]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberUnit_Trust](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[memberID] [int] NOT NULL,
	[unitID] [int] NULL,
	[unitSponsor] [int] NULL,
	[sponsorIndex] [varchar](4000) NULL,
	[levelx] [int] NULL,
	[unitPosition] [varchar](50) NULL,
	[unitUpline] [int] NULL,
	[uplineIndex] [varchar](4000) NULL,
	[levelfx] [int] NULL,
	[node] [int] NULL,
	[placementtype] [char](1) NULL,
	[isActivated] [bit] NULL,
	[isDeleted] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[CreatedBy] [varchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_MemberUnit_Trust_1] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC,
	[memberID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_MemberUnit_Will]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_MemberUnit_Will](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[memberID] [int] NOT NULL,
	[unitID] [int] NULL,
	[unitSponsor] [int] NULL,
	[sponsorIndex] [varchar](4000) NULL,
	[levelx] [int] NULL,
	[unitPosition] [varchar](50) NULL,
	[unitUpline] [int] NULL,
	[uplineIndex] [varchar](4000) NULL,
	[levelfx] [int] NULL,
	[node] [int] NULL,
	[placementtype] [char](1) NULL,
	[isActivated] [bit] NULL,
	[isDeleted] [bit] NULL,
	[CreatedAt] [datetime] NULL,
	[CreatedBy] [varchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_MemberUnit_Will_1] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC,
	[memberID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Merchant]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Merchant](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[MerchantName] [nvarchar](200) NOT NULL,
	[MerchantCode] [varchar](50) NULL,
	[PrimaryLang] [varchar](50) NULL,
	[Country_Domain] [nvarchar](5) NOT NULL,
	[Country] [nvarchar](50) NOT NULL,
	[Currency] [varchar](50) NOT NULL,
	[ThemeID] [varchar](50) NOT NULL,
	[DisplayID] [varchar](50) NULL,
	[WhatsappHpno] [varchar](50) NOT NULL,
	[MerchantType] [char](1) NOT NULL,
	[SecondPassword] [int] NOT NULL,
	[GoogleTwoFactor] [int] NOT NULL,
	[EmailOTP] [int] NOT NULL,
	[PhoneOTP] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[Status] [int] NOT NULL,
	[AgentID] [bigint] NOT NULL,
	[AntiPhishingCode] [varchar](20) NOT NULL,
	[Prefix] [varchar](10) NULL,
	[Mail_Lang] [nvarchar](10) NULL,
	[Sms_Lang] [nvarchar](10) NULL,
 CONSTRAINT [PK_tbl_Merchant] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Merchant_Sms]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Merchant_Sms](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[ShortName] [nvarchar](50) NULL,
	[ServiceName] [nvarchar](50) NOT NULL,
	[ApiKey] [nvarchar](50) NULL,
	[SecretKey] [nvarchar](200) NULL,
	[Balance] [decimal](18, 8) NOT NULL,
	[IsMaster] [int] NOT NULL,
	[LastUpdateDate] [datetime] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Merchant_Sms] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_OpenAiModelPricing]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_OpenAiModelPricing](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Model] [varchar](100) NOT NULL,
	[InputPricePerMillion] [decimal](18, 8) NOT NULL,
	[CachedInputPricePerMillion] [decimal](18, 8) NOT NULL,
	[OutputPricePerMillion] [decimal](18, 8) NOT NULL,
	[Currency] [varchar](10) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[EffectiveFrom] [datetime] NOT NULL,
	[EffectiveTo] [datetime] NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_OpenAiRequestLog]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_OpenAiRequestLog](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[RequestType] [varchar](50) NOT NULL,
	[Source] [varchar](100) NOT NULL,
	[UserID] [bigint] NULL,
	[MerchantID] [varchar](50) NULL,
	[OpenAiResponseID] [varchar](150) NULL,
	[Model] [varchar](100) NULL,
	[InputTokens] [int] NULL,
	[CachedInputTokens] [int] NULL,
	[OutputTokens] [int] NULL,
	[ReasoningTokens] [int] NULL,
	[TotalTokens] [int] NULL,
	[InputPricePerMillion] [decimal](18, 8) NULL,
	[CachedInputPricePerMillion] [decimal](18, 8) NULL,
	[OutputPricePerMillion] [decimal](18, 8) NULL,
	[InputCostUSD] [decimal](18, 8) NULL,
	[CachedInputCostUSD] [decimal](18, 8) NULL,
	[OutputCostUSD] [decimal](18, 8) NULL,
	[TotalCostUSD] [decimal](18, 8) NULL,
	[CostCalculated] [bit] NOT NULL,
	[ImageSizeBytes] [int] NULL,
	[DurationMs] [bigint] NULL,
	[HttpStatusCode] [int] NULL,
	[IsSuccess] [bit] NOT NULL,
	[ErrorMessage] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Parameter]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Parameter](
	[category] [nvarchar](100) NOT NULL,
	[parameterName] [nvarchar](50) NOT NULL,
	[parameterValue] [nvarchar](200) NOT NULL,
	[remarks] [nvarchar](max) NULL,
	[sorting] [int] NULL,
 CONSTRAINT [PK_tbl_Parameter] PRIMARY KEY CLUSTERED 
(
	[category] ASC,
	[parameterName] ASC,
	[parameterValue] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Reference]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Reference](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[ReferralCode] [varchar](50) NOT NULL,
	[Type] [varchar](10) NOT NULL,
	[Ranking] [int] NOT NULL,
	[AdvanceRanking] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Reference] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_RegistrationSession]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_RegistrationSession](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[SessionID] [uniqueidentifier] NOT NULL,
	[TokenHash] [varchar](128) NOT NULL,
	[ReferralCode] [varchar](50) NULL,
	[MerchantID] [varchar](50) NULL,
	[Email] [varchar](255) NULL,
	[Status] [varchar](20) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ExpiresAt] [datetime] NOT NULL,
	[LastActivityAt] [datetime] NULL,
	[CompletedAt] [datetime] NULL,
	[CreatedIP] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Relationship]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Relationship](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Relationship_Code] [varchar](50) NOT NULL,
	[Relationship_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Relationship] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Religion]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Religion](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Religion_Code] [varchar](50) NOT NULL,
	[Religion_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Religion] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_RememberMeToken]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_RememberMeToken](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Token] [uniqueidentifier] NOT NULL,
	[CreatedDate] [datetime] NOT NULL,
	[LastUsedDate] [datetime] NULL,
	[ExpiryDate] [datetime] NOT NULL,
	[IsRevoked] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_ResetPassword]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_ResetPassword](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ChangeType] [varchar](50) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Email] [nvarchar](100) NOT NULL,
	[Expired] [datetime] NOT NULL,
	[UniqueID] [nvarchar](200) NOT NULL,
	[Signature] [nvarchar](200) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
	[IP] [nvarchar](500) NULL,
	[Updated_IP] [nvarchar](500) NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_ResetPassword] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Resource]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Resource](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [nvarchar](50) NOT NULL,
	[PublicID] [uniqueidentifier] NOT NULL,
	[CategoryCode] [varchar](50) NOT NULL,
	[Name] [nvarchar](200) NOT NULL,
	[Type] [varchar](30) NOT NULL,
	[Description] [nvarchar](max) NULL,
	[FileUrl] [nvarchar](1000) NULL,
	[UploadedFile] [nvarchar](1000) NULL,
	[OriginalFileName] [nvarchar](255) NULL,
	[StoredFileName] [nvarchar](255) NULL,
	[FileExtension] [nvarchar](20) NULL,
	[ContentType] [nvarchar](150) NULL,
	[FileSize] [bigint] NULL,
	[FileUploadAuditID] [bigint] NULL,
	[Url] [nvarchar](2000) NULL,
	[StartDate] [datetime] NULL,
	[EndDate] [datetime] NULL,
	[Status] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [nvarchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [nvarchar](50) NULL,
	[IsDeleted] [bit] NOT NULL,
 CONSTRAINT [PK__tbl_Reso__FFEE7451D1AF5AC7] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_ResourceCategory]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_ResourceCategory](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [nvarchar](50) NOT NULL,
	[CategoryCode] [varchar](50) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [nvarchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [nvarchar](50) NULL,
	[IsDeleted] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_ResourceRole]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_ResourceRole](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ResourceID] [bigint] NOT NULL,
	[RoleCode] [varchar](50) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_ResourceRole_Resource_Role] UNIQUE NONCLUSTERED 
(
	[ResourceID] ASC,
	[RoleCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Role]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Role](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NULL,
	[RoleCode] [nvarchar](50) NULL,
	[RoleName] [nvarchar](50) NULL,
	[UserType] [varchar](50) NULL,
	[IsDeleted] [int] NULL,
	[AdminRank] [int] NULL,
	[CreatedAt] [datetime] NULL,
	[CreatedBy] [nvarchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [nvarchar](50) NULL,
 CONSTRAINT [PK_tbl_Role_1] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_RunningNumber]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_RunningNumber](
	[Prefix] [varchar](10) NOT NULL,
	[RunningYearMonth] [char](6) NOT NULL,
	[LastNumber] [int] NOT NULL,
 CONSTRAINT [PK_tbl_RunningNumber] PRIMARY KEY CLUSTERED 
(
	[Prefix] ASC,
	[RunningYearMonth] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Sms_History]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Sms_History](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Type] [varchar](50) NOT NULL,
	[SenderMobile] [nvarchar](50) NOT NULL,
	[SmsContent] [nvarchar](400) NOT NULL,
	[Reference] [nvarchar](100) NULL,
	[ErrorRemark] [nvarchar](max) NULL,
	[IP] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [varchar](50) NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Sms_History] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TAC]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TAC](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NULL,
	[SentMethod] [varchar](50) NULL,
	[ReceiverAddress] [varchar](100) NULL,
	[Code] [varchar](10) NULL,
	[Type] [varchar](50) NULL,
	[IP] [nvarchar](500) NULL,
	[CreatedBy] [varchar](50) NULL,
	[CreatedAt] [datetime] NULL,
	[ExpiredAt] [datetime] NULL,
	[UpdatedBy] [varchar](50) NULL,
	[UpdatedAt] [datetime] NULL,
	[Status] [int] NULL,
 CONSTRAINT [PK_tbl_TAC] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustID] [bigint] NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[ProductCode] [varchar](50) NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[HasCaretakerDistribution] [bit] NOT NULL,
	[ApplicationStatus] [varchar](50) NOT NULL,
	[CurrentStep] [int] NOT NULL,
	[LastCompletedStep] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[SubmittedAt] [datetime] NULL,
	[SubmittedBy] [bigint] NULL,
	[CommencementDate] [date] NULL,
	[MaturityDate] [date] NULL,
	[RejectedAt] [datetime] NULL,
	[RejectedBy] [bigint] NULL,
	[EarlyWithdrawnAt] [datetime] NULL,
	[EarlyWithdrawnBy] [bigint] NULL,
 CONSTRAINT [PK__tbl_Trus__FFEE7451663777D7] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_Beneficiary]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_Beneficiary](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[FullName] [nvarchar](200) NOT NULL,
	[IdentityType] [varchar](30) NOT NULL,
	[IdentityNo] [varchar](100) NOT NULL,
	[Nationality] [varchar](100) NOT NULL,
	[Gender] [varchar](20) NULL,
	[DateOfBirth] [date] NULL,
	[Email] [varchar](200) NULL,
	[ContactNo] [varchar](50) NULL,
	[RelationshipCode] [varchar](50) NOT NULL,
	[OtherRelationship] [nvarchar](200) NULL,
	[AddressLine1] [nvarchar](300) NOT NULL,
	[AddressLine2] [nvarchar](300) NULL,
	[Postcode] [varchar](20) NOT NULL,
	[City] [nvarchar](100) NOT NULL,
	[State] [nvarchar](100) NOT NULL,
	[Country] [varchar](100) NOT NULL,
	[IsUSTaxPayer] [bit] NOT NULL,
	[HasOtherTaxResidence] [bit] NOT NULL,
	[TaxResidenceCountry] [varchar](100) NULL,
	[TaxIdentificationNo] [varchar](100) NULL,
	[TINUnavailableReason] [varchar](50) NULL,
	[TINUnavailableExplanation] [nvarchar](1000) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK__tbl_Trus__FFEE74516D6B470D] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_BeneficiaryAllocation]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocation](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[AllocationType] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[AllocationID] [bigint] NOT NULL,
	[BeneficiaryID] [bigint] NULL,
	[RoleType] [varchar](20) NOT NULL,
	[AllocationPercentage] [decimal](7, 4) NULL,
	[IsTrusteeCompany] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_Caretaker]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_Caretaker](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[CaretakerType] [varchar](20) NOT NULL,
	[FullName] [nvarchar](200) NOT NULL,
	[IdentityNo] [nvarchar](50) NOT NULL,
	[ContactNo] [nvarchar](30) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_Caretaker] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_CoBroker]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_CoBroker](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[MemberID] [bigint] NOT NULL,
	[Email] [varchar](200) NOT NULL,
	[AllocationPercentage] [decimal](7, 4) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_DividendSchedule]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_DividendSchedule](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[ScheduleNo] [int] NOT NULL,
	[ReturnYear] [int] NOT NULL,
	[PeriodNo] [int] NOT NULL,
	[DividendMethod] [varchar](60) NOT NULL,
	[PayoutFrequency] [varchar](30) NOT NULL,
	[CalculationStart] [varchar](50) NOT NULL,
	[PeriodStartDate] [date] NOT NULL,
	[PeriodEndDate] [date] NOT NULL,
	[PayoutDate] [date] NOT NULL,
	[CalculationBasisAmount] [decimal](18, 2) NOT NULL,
	[AnnualRate] [decimal](9, 4) NOT NULL,
	[BaseDividendAmount] [decimal](18, 2) NOT NULL,
	[BonusAmount] [decimal](18, 2) NOT NULL,
	[TotalReturnAmount] [decimal](18, 2) NOT NULL,
	[ReturnOption] [varchar](50) NOT NULL,
	[PayoutAmount] [decimal](18, 2) NOT NULL,
	[RedepositAmount] [decimal](18, 2) NOT NULL,
	[Status] [varchar](30) NOT NULL,
	[PaidAt] [datetime] NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_DividendSchedule] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_tbl_TrustApplication_DividendSchedule] UNIQUE NONCLUSTERED 
(
	[TrustApplicationID] ASC,
	[ScheduleNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_GeneratedDocument]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_GeneratedDocument](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[TrustDocumentID] [bigint] NOT NULL,
	[TrustDocumentTemplateID] [bigint] NOT NULL,
	[GenerationStatus] [varchar](20) NOT NULL,
	[OriginalFileName] [nvarchar](255) NULL,
	[FileExtension] [varchar](20) NULL,
	[FileSize] [bigint] NULL,
	[FileUrl] [nvarchar](1000) NULL,
	[GeneratedFile] [nvarchar](1000) NULL,
	[SHA256] [varchar](64) NULL,
	[GeneratedAt] [datetime] NULL,
	[GeneratedBy] [bigint] NULL,
	[ErrorMessage] [nvarchar](1000) NULL,
	[RetryCount] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_GeneratedDocument] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_History]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_History](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[EventCode] [varchar](50) NOT NULL,
	[EventTitle] [nvarchar](200) NOT NULL,
	[EventDescription] [nvarchar](1000) NULL,
	[ReferenceType] [varchar](50) NULL,
	[ReferenceID] [bigint] NULL,
	[OldStatus] [varchar](50) NULL,
	[NewStatus] [varchar](50) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
 CONSTRAINT [PK_tbl_TrustApplication_History] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_MinorDistribution]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_MinorDistribution](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[DistributionMethod] [varchar](20) NOT NULL,
	[ReleaseAge] [int] NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_MinorDistribution] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_TrustApplication_MinorDistribution] UNIQUE NONCLUSTERED 
(
	[TrustApplicationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_Payment]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_Payment](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[PaymentNo] [int] NOT NULL,
	[PaymentAmount] [decimal](18, 2) NOT NULL,
	[PaymentDate] [datetime] NULL,
	[ReferenceNo] [varchar](150) NULL,
	[PaymentStatus] [varchar](30) NOT NULL,
	[FinanceRemark] [nvarchar](500) NULL,
	[ApprovedAt] [datetime] NULL,
	[ApprovedBy] [bigint] NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_Payment] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_TrustApplicationPayment_PaymentNo] UNIQUE NONCLUSTERED 
(
	[TrustApplicationID] ASC,
	[PaymentNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_PaymentDocument]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_PaymentDocument](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[PaymentID] [bigint] NOT NULL,
	[OriginalFileName] [nvarchar](255) NOT NULL,
	[FileExtension] [varchar](20) NOT NULL,
	[FileSize] [bigint] NOT NULL,
	[FileUrl] [nvarchar](1000) NOT NULL,
	[UploadedFile] [nvarchar](1000) NOT NULL,
	[SHA256] [varchar](64) NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustApplication_PaymentDocument] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_PersonalDetail]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_PersonalDetail](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[FullName] [nvarchar](200) NULL,
	[IdentityType] [varchar](30) NULL,
	[IdentityNo] [varchar](100) NULL,
	[Nationality] [varchar](100) NULL,
	[Gender] [varchar](20) NULL,
	[DateOfBirth] [date] NULL,
	[Email] [varchar](200) NULL,
	[ContactNo] [varchar](50) NULL,
	[AddressLine1] [nvarchar](300) NULL,
	[AddressLine2] [nvarchar](300) NULL,
	[Postcode] [varchar](20) NULL,
	[City] [nvarchar](100) NULL,
	[State] [nvarchar](100) NULL,
	[Country] [varchar](100) NULL,
	[IsUSTaxPayer] [bit] NULL,
	[HasOtherTaxResidence] [bit] NULL,
	[TaxResidenceCountry] [varchar](100) NULL,
	[TaxIdentificationNo] [varchar](100) NULL,
	[TINUnavailableReason] [varchar](50) NULL,
	[TINUnavailableExplanation] [nvarchar](1000) NULL,
	[EmployerName] [nvarchar](200) NULL,
	[NatureOfBusiness] [nvarchar](200) NULL,
	[Occupation] [nvarchar](200) NULL,
	[AnnualIncomeCode] [varchar](50) NULL,
	[NetWorthCode] [varchar](50) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_PlanSnapshot]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_PlanSnapshot](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[ProductCode] [varchar](50) NOT NULL,
	[SnapshotVersion] [int] NOT NULL,
	[PlanConfigurationJson] [nvarchar](max) NOT NULL,
	[SnapshotHash] [varchar](64) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NOT NULL,
 CONSTRAINT [PK_tbl_TrustApplication_PlanSnapshot] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UX_tbl_TrustApplication_PlanSnapshot_TrustApplicationID] UNIQUE NONCLUSTERED 
(
	[TrustApplicationID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_SourceOfFund]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_SourceOfFund](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[SourceCode] [varchar](50) NOT NULL,
	[OtherDescription] [nvarchar](500) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_StatusHistory]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_StatusHistory](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[PreviousStatus] [varchar](50) NULL,
	[NewStatus] [varchar](50) NOT NULL,
	[Remark] [nvarchar](500) NULL,
	[ChangedAt] [datetime] NOT NULL,
	[ChangedBy] [bigint] NOT NULL,
 CONSTRAINT [PK_tbl_TrustApplication_StatusHistory] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_SupportingDocument]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_SupportingDocument](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[OriginalFileName] [nvarchar](255) NOT NULL,
	[FileExtension] [varchar](20) NOT NULL,
	[FileSize] [bigint] NOT NULL,
	[FileUrl] [nvarchar](1000) NOT NULL,
	[UploadedFile] [nvarchar](1000) NOT NULL,
	[SHA256] [varchar](64) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[IsActive] [bit] NOT NULL,
	[DeletedAt] [datetime] NULL,
	[DeletedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_TrustAsset]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_TrustAsset](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[TrustAssetAmount] [decimal](18, 2) NOT NULL,
	[SettlorBankName] [varchar](100) NOT NULL,
	[SettlorOtherBankName] [nvarchar](200) NULL,
	[SettlorBankAccountHolder] [nvarchar](200) NOT NULL,
	[SettlorBankAccountNumber] [varchar](100) NOT NULL,
	[SettlorSwiftCode] [varchar](50) NULL,
	[SettlorBankAddress] [nvarchar](500) NULL,
	[GuaranteedReturnOption] [varchar](50) NOT NULL,
	[PaymentSource] [varchar](50) NOT NULL,
	[JointAccountHolderName] [nvarchar](200) NULL,
	[ThirdPartyName] [nvarchar](200) NULL,
	[ThirdPartyIdentityNo] [varchar](100) NULL,
	[ThirdPartyRelationship] [varchar](100) NULL,
	[ThirdPartyOtherRelationship] [nvarchar](200) NULL,
	[ThirdPartyBankName] [varchar](100) NULL,
	[ThirdPartyOtherBankName] [nvarchar](200) NULL,
	[ThirdPartyBankAccountHolder] [nvarchar](200) NULL,
	[ThirdPartyBankAccountNumber] [varchar](100) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustApplication_TrustDeedExecution]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustApplication_TrustDeedExecution](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustApplicationID] [bigint] NOT NULL,
	[SigningMethod] [varchar](50) NOT NULL,
	[SpecialCircumstance] [varchar](50) NOT NULL,
	[ReadOverBy] [nvarchar](200) NULL,
	[ReadOverIdentityNo] [varchar](100) NULL,
	[LanguageOrDialect] [nvarchar](100) NULL,
	[RelationshipWithSettlor] [varchar](50) NULL,
	[OtherRelationshipWithSettlor] [nvarchar](200) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustCategories]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustCategories](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MerchantID] [varchar](50) NOT NULL,
	[CategoryID] [nvarchar](50) NOT NULL,
	[CategoryName] [nvarchar](100) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [nvarchar](50) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_TrustCategories] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustDocument]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustDocument](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[DocumentCode] [varchar](50) NOT NULL,
	[DocumentName] [nvarchar](200) NOT NULL,
	[Description] [nvarchar](500) NULL,
	[AvailableStage] [varchar](50) NOT NULL,
	[DocumentType] [varchar](30) NOT NULL,
	[GenerateAutomatically] [bit] NOT NULL,
	[GenerateOnDemand] [bit] NOT NULL,
	[GenerationOrder] [int] NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustDocument] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustDocument_DocumentCode] UNIQUE NONCLUSTERED 
(
	[DocumentCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustDocumentAllocationMapping]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustDocumentAllocationMapping](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[AllocationType] [varchar](50) NOT NULL,
	[TrustDocumentID] [bigint] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustDocumentAllocationMapping] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustDocumentAllocationMapping] UNIQUE NONCLUSTERED 
(
	[AllocationType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustDocumentRole]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustDocumentRole](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustDocumentID] [bigint] NOT NULL,
	[RoleCode] [varchar](20) NOT NULL,
	[CanView] [bit] NOT NULL,
	[CanDownload] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustDocumentRole] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustDocumentRole] UNIQUE NONCLUSTERED 
(
	[TrustDocumentID] ASC,
	[RoleCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustDocumentTemplate]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustDocumentTemplate](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustDocumentID] [bigint] NOT NULL,
	[TemplateVersion] [varchar](30) NOT NULL,
	[TemplateType] [varchar](20) NOT NULL,
	[TemplatePath] [nvarchar](1000) NOT NULL,
	[OutputFileNameFormat] [nvarchar](255) NULL,
	[EffectiveFrom] [datetime] NULL,
	[EffectiveTo] [datetime] NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustDocumentTemplate] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustDocumentTemplate_Version] UNIQUE NONCLUSTERED 
(
	[TrustDocumentID] ASC,
	[TemplateVersion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlan]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlan](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[ProductCode] [nvarchar](50) NULL,
	[ProductName] [nvarchar](200) NOT NULL,
	[ProductCategory] [varchar](50) NOT NULL,
	[ProductDescription] [nvarchar](max) NULL,
	[MinimumPlacement] [decimal](18, 2) NOT NULL,
	[MaximumPlacement] [decimal](18, 2) NULL,
	[FundManagementPeriod] [int] NOT NULL,
	[FundManagementPeriodUnit] [varchar](20) NOT NULL,
	[ProductStatus] [varchar](20) NOT NULL,
	[HasComplimentaryBenefits] [bit] NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
	[CreatedBy] [bigint] NULL,
	[UpdatedAt] [datetime2](7) NULL,
	[UpdatedBy] [bigint] NULL,
 CONSTRAINT [PK_tbl_TrustPlan] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanBenefit]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanBenefit](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[MinimumPlacement] [decimal](18, 2) NOT NULL,
	[MaximumPlacement] [decimal](18, 2) NULL,
	[BenefitName] [nvarchar](250) NOT NULL,
	[BenefitValue] [decimal](18, 2) NULL,
	[FulfilmentMethod] [varchar](30) NOT NULL,
	[Sequence] [int] NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanBenefit] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanBonusConfig]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanBonusConfig](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[HasBonusReturn] [bit] NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanBonusConfig] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanBonusConfig] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanCommissionConfig]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanCommissionConfig](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[IsEnabled] [bit] NOT NULL,
	[CommissionMethod] [varchar](60) NULL,
 CONSTRAINT [PK_tbl_TrustPlanCommissionConfig] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanCommissionConfig] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanCommissionOneOffTier]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanCommissionOneOffTier](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[RankCode] [varchar](20) NOT NULL,
	[CommissionType] [varchar](30) NOT NULL,
	[CommissionRate] [decimal](9, 4) NOT NULL,
	[Sequence] [int] NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanCommissionOneOffTier] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanCommissionOneOffTier] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC,
	[RankCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanCommissionRule]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanCommissionRule](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[CalculationBasis] [varchar](50) NOT NULL,
	[RankDetermination] [varchar](50) NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanCommissionRule] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanCommissionRule] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanDividendConfig]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanDividendConfig](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[DividendMethod] [varchar](60) NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanDividendConfig] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanDividendConfig] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanDividendInvestmentPeriodTier]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanDividendInvestmentPeriodTier](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[MinimumPlacement] [decimal](18, 2) NOT NULL,
	[MaximumPlacement] [decimal](18, 2) NULL,
	[Sequence] [int] NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanDividendInvestmentPeriodTier] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanDividendInvestmentPeriodTierRate]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanDividendInvestmentPeriodTierRate](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[InvestmentPeriodTierID] [bigint] NOT NULL,
	[PeriodNo] [int] NOT NULL,
	[Rate] [decimal](9, 4) NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanDividendInvestmentPeriodTierRate] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanDividendInvestmentPeriodTierRate] UNIQUE NONCLUSTERED 
(
	[InvestmentPeriodTierID] ASC,
	[PeriodNo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanDividendPayout]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanDividendPayout](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[PayoutFrequency] [varchar](30) NOT NULL,
	[CalculationStart] [varchar](50) NOT NULL,
	[AllowDividendRedeposit] [bit] NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanDividendPayout] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanDividendPayout] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanExecutionRank]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanExecutionRank](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[RankCode] [varchar](20) NOT NULL,
	[CreatedAt] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanExecutionRank] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanExecutionRank] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC,
	[RankCode] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanFee]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanFee](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[FeeType] [varchar](50) NOT NULL,
	[RateType] [varchar](30) NOT NULL,
	[FeeValue] [decimal](18, 4) NOT NULL,
	[ChargeTiming] [varchar](50) NULL,
 CONSTRAINT [PK_tbl_TrustPlanFee] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanFee] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC,
	[FeeType] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanPaymentConfig]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanPaymentConfig](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[PaymentFrequency] [varchar](30) NOT NULL,
 CONSTRAINT [PK_tbl_TrustPlanPaymentConfig] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanPaymentConfig] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_TrustPlanWithdrawalConfig]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_TrustPlanWithdrawalConfig](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[TrustPlanID] [bigint] NOT NULL,
	[LockInPeriod] [int] NOT NULL,
	[LockInPeriodUnit] [varchar](20) NOT NULL,
	[AllowEarlyWithdrawal] [bit] NOT NULL,
	[EarlyWithdrawalFeeType] [varchar](30) NULL,
	[EarlyWithdrawalFeeValue] [decimal](18, 4) NULL,
 CONSTRAINT [PK_tbl_TrustPlanWithdrawalConfig] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_tbl_TrustPlanWithdrawalConfig] UNIQUE NONCLUSTERED 
(
	[TrustPlanID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Asset_Allocation]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Asset_Allocation](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Asset_Allocation_Code] [varchar](50) NOT NULL,
	[Asset_Allocation_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Asset_Allocation] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Executor]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Executor](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Executor_Code] [varchar](50) NOT NULL,
	[Executor_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Executor] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Identity]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Identity](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Identity_Code] [varchar](50) NOT NULL,
	[Identity_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Identity] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Land]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Land](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Land_Code] [varchar](50) NOT NULL,
	[Land_Name] [nvarchar](200) NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Land] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Payment_To_Trustee]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Payment_To_Trustee](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Payment_To_Trustee_Code] [varchar](50) NOT NULL,
	[Payment_To_Trustee_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Payment_To_Trustee] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Property]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Property](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Property_Type_Code] [varchar](50) NOT NULL,
	[Property_Type_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Property] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_Type_Of_Title]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_Type_Of_Title](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Title_Type_Code] [varchar](50) NOT NULL,
	[Title_Type_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_Type_Of_Title] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_UnitTrust_Account_Type]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_UnitTrust_Account_Type](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[Account_Type_Code] [varchar](50) NOT NULL,
	[Account_Type_Name] [nvarchar](200) NOT NULL,
	[Sort] [int] NOT NULL,
	[Status] [int] NOT NULL,
 CONSTRAINT [PK_tbl_UnitTrust_Account_Type] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[tbl_WalletCash]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[tbl_WalletCash](
	[RowID] [bigint] IDENTITY(1,1) NOT NULL,
	[MemberID] [bigint] NULL,
	[FromUID] [bigint] NULL,
	[ToID] [bigint] NULL,
	[Debit] [decimal](18, 8) NULL,
	[Credit] [decimal](18, 8) NULL,
	[TransactionID] [varchar](50) NULL,
	[TransactionType] [varchar](50) NULL,
	[WalletType] [int] NULL,
	[Remarks] [nvarchar](500) NULL,
	[Record] [nvarchar](500) NULL,
	[OnHold] [bit] NULL,
	[isDeleted] [bit] NULL,
	[CreatedBy] [bigint] NULL,
	[CreatedAt] [datetime] NULL,
	[UpdatedBy] [bigint] NULL,
	[UpdatedAt] [datetime] NULL,
	[NType] [varchar](5) NULL,
 CONSTRAINT [PK_tbl_WalletCash] PRIMARY KEY CLUSTERED 
(
	[RowID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, FILLFACTOR = 90, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[AggregatedCounter]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[AggregatedCounter](
	[Key] [nvarchar](100) NOT NULL,
	[Value] [bigint] NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_CounterAggregated] PRIMARY KEY CLUSTERED 
(
	[Key] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Counter]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Counter](
	[Key] [nvarchar](100) NOT NULL,
	[Value] [int] NOT NULL,
	[ExpireAt] [datetime] NULL,
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_HangFire_Counter] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Hash]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Hash](
	[Key] [nvarchar](100) NOT NULL,
	[Field] [nvarchar](100) NOT NULL,
	[Value] [nvarchar](max) NULL,
	[ExpireAt] [datetime2](7) NULL,
 CONSTRAINT [PK_HangFire_Hash] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Field] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = ON, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Job]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Job](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[StateId] [bigint] NULL,
	[StateName] [nvarchar](20) NULL,
	[InvocationData] [nvarchar](max) NOT NULL,
	[Arguments] [nvarchar](max) NOT NULL,
	[CreatedAt] [datetime] NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_Job] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[JobParameter]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[JobParameter](
	[JobId] [bigint] NOT NULL,
	[Name] [nvarchar](40) NOT NULL,
	[Value] [nvarchar](max) NULL,
 CONSTRAINT [PK_HangFire_JobParameter] PRIMARY KEY CLUSTERED 
(
	[JobId] ASC,
	[Name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[JobQueue]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[JobQueue](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[JobId] [bigint] NOT NULL,
	[Queue] [nvarchar](50) NOT NULL,
	[FetchedAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_JobQueue] PRIMARY KEY CLUSTERED 
(
	[Queue] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[List]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[List](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[Key] [nvarchar](100) NOT NULL,
	[Value] [nvarchar](max) NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_List] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Schema]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Schema](
	[Version] [int] NOT NULL,
 CONSTRAINT [PK_HangFire_Schema] PRIMARY KEY CLUSTERED 
(
	[Version] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Server]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Server](
	[Id] [nvarchar](200) NOT NULL,
	[Data] [nvarchar](max) NULL,
	[LastHeartbeat] [datetime] NOT NULL,
 CONSTRAINT [PK_HangFire_Server] PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[Set]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[Set](
	[Key] [nvarchar](100) NOT NULL,
	[Score] [float] NOT NULL,
	[Value] [nvarchar](256) NOT NULL,
	[ExpireAt] [datetime] NULL,
 CONSTRAINT [PK_HangFire_Set] PRIMARY KEY CLUSTERED 
(
	[Key] ASC,
	[Value] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = ON, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [HangFire].[State]    Script Date: 23/9/2026 10:52:46 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [HangFire].[State](
	[Id] [bigint] IDENTITY(1,1) NOT NULL,
	[JobId] [bigint] NOT NULL,
	[Name] [nvarchar](20) NOT NULL,
	[Reason] [nvarchar](100) NULL,
	[CreatedAt] [datetime] NOT NULL,
	[Data] [nvarchar](max) NULL,
 CONSTRAINT [PK_HangFire_State] PRIMARY KEY CLUSTERED 
(
	[JobId] ASC,
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[tbl_2Fa] ADD  CONSTRAINT [DF_tbl_2Fa_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_AgentRank] ADD  CONSTRAINT [DF_tbl_AgentRank_IsAutoRankEligible]  DEFAULT ((1)) FOR [IsAutoRankEligible]
GO
ALTER TABLE [dbo].[tbl_AgentRank] ADD  CONSTRAINT [DF_tbl_AgentRank_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_AgentRankingHistory] ADD  CONSTRAINT [DF_tbl_AgentRankingHistory_PreviousAdvanceRanking]  DEFAULT ((0)) FOR [PreviousAdvanceRanking]
GO
ALTER TABLE [dbo].[tbl_AgentRankingHistory] ADD  CONSTRAINT [DF_tbl_AgentRankingHistory_NewAdvanceRanking]  DEFAULT ((0)) FOR [NewAdvanceRanking]
GO
ALTER TABLE [dbo].[tbl_AgentRankingHistory] ADD  CONSTRAINT [DF_tbl_AgentRankingHistory_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_ApiRequestLog] ADD  CONSTRAINT [DF__tbl_ApiRe__Reque__4381D8D3]  DEFAULT (getdate()) FOR [RequestTime]
GO
ALTER TABLE [dbo].[tbl_ApiRequestLog] ADD  CONSTRAINT [DF__tbl_ApiRe__Creat__4475FD0C]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Bank_Account_Type] ADD  CONSTRAINT [DF_tbl_Bank_Account_Type_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Config_General] ADD  CONSTRAINT [DF_tbl_Config_General_Aff_Percentage]  DEFAULT ((0)) FOR [Clause_Amount]
GO
ALTER TABLE [dbo].[tbl_Config_General] ADD  CONSTRAINT [DF_tbl_Config_General_SST]  DEFAULT ((0)) FOR [SST]
GO
ALTER TABLE [dbo].[tbl_Config_Sms] ADD  CONSTRAINT [DF_tbl_Config_Sms_Balance]  DEFAULT ((0)) FOR [Balance]
GO
ALTER TABLE [dbo].[tbl_Config_Sms] ADD  CONSTRAINT [DF_tbl_Config_Sms_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_EmailQueue] ADD  CONSTRAINT [DF_tbl_EmailQueue_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_EmailQueue] ADD  CONSTRAINT [DF_tbl_EmailQueue_RetryCount]  DEFAULT ((0)) FOR [RetryCount]
GO
ALTER TABLE [dbo].[tbl_EmailQueue] ADD  CONSTRAINT [DF_tbl_EmailQueue_CreatedDate]  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[tbl_EmailVerification] ADD  CONSTRAINT [DF_tbl_EmailVerification_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_FileUploadAudit] ADD  DEFAULT ((0)) FOR [ScanStatus]
GO
ALTER TABLE [dbo].[tbl_FileUploadAudit] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Funeral_Method] ADD  CONSTRAINT [DF_tbl_Funeral_Method_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_log_FileUpload] ADD  CONSTRAINT [DF_tbl_log_FileUpload_PublicID]  DEFAULT (newsequentialid()) FOR [PublicID]
GO
ALTER TABLE [dbo].[tbl_log_FileUpload] ADD  CONSTRAINT [DF_tbl_log_FileUpload_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_log_login] ADD  CONSTRAINT [DF_tbl_log_login_log_credit]  DEFAULT ((0)) FOR [log_credit]
GO
ALTER TABLE [dbo].[tbl_log_login] ADD  CONSTRAINT [DF_tbl_log_login_log_clearcredit]  DEFAULT ((0)) FOR [log_clearcredit]
GO
ALTER TABLE [dbo].[tbl_log_Registration] ADD  CONSTRAINT [DF_tbl_log_Registration_Ranking]  DEFAULT ((0)) FOR [Ranking]
GO
ALTER TABLE [dbo].[tbl_log_Registration] ADD  CONSTRAINT [DF_tbl_log_Registration_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_log_SecurityAttemp] ADD  CONSTRAINT [DF_tbl_log_SecurityAttemp_log_credit]  DEFAULT ((0)) FOR [log_credit]
GO
ALTER TABLE [dbo].[tbl_log_SecurityAttemp] ADD  CONSTRAINT [DF_tbl_log_SecurityAttemp_log_clearcredit]  DEFAULT ((0)) FOR [log_clearcredit]
GO
ALTER TABLE [dbo].[tbl_log_securityPassAttemp] ADD  CONSTRAINT [DF_tbl_log_securityPassAttemp_log_credit]  DEFAULT ((0)) FOR [log_credit]
GO
ALTER TABLE [dbo].[tbl_log_securityPassAttemp] ADD  CONSTRAINT [DF_tbl_log_securityPassAttemp_log_clearcredit]  DEFAULT ((0)) FOR [log_clearcredit]
GO
ALTER TABLE [dbo].[tbl_log_SendMail] ADD  CONSTRAINT [DF_tbl_log_SendMail_RefID]  DEFAULT ((0)) FOR [RefID]
GO
ALTER TABLE [dbo].[tbl_log_SendMail] ADD  CONSTRAINT [DF_tbl_log_SendMail]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_log_sql] ADD  CONSTRAINT [DF_tbl_log_sql_createdAt]  DEFAULT (getdate()) FOR [createdAt]
GO
ALTER TABLE [dbo].[tbl_log_TacAttemp] ADD  CONSTRAINT [DF_tbl_log_TacAttemp_log_credit]  DEFAULT ((0)) FOR [log_credit]
GO
ALTER TABLE [dbo].[tbl_log_TacAttemp] ADD  CONSTRAINT [DF_tbl_log_TacAttemp_log_clearcredit]  DEFAULT ((0)) FOR [log_clearcredit]
GO
ALTER TABLE [dbo].[tbl_Login] ADD  CONSTRAINT [DF_tbl_Login_firstLogin]  DEFAULT ((1)) FOR [FirstLogin]
GO
ALTER TABLE [dbo].[tbl_Login] ADD  CONSTRAINT [DF_tbl_Login_renewalDate]  DEFAULT (getdate()) FOR [renewalDate]
GO
ALTER TABLE [dbo].[tbl_Master_BankList] ADD  CONSTRAINT [DF_tbl_Master_BankList_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Master_BankList] ADD  CONSTRAINT [DF_tbl_Master_BankList_IsDeposit]  DEFAULT ((0)) FOR [IsDeposit]
GO
ALTER TABLE [dbo].[tbl_Master_BankList] ADD  CONSTRAINT [DF_tbl_Master_BankList_IsWithdrawal]  DEFAULT ((0)) FOR [IsWithdrawal]
GO
ALTER TABLE [dbo].[tbl_MemberBalance] ADD  CONSTRAINT [DF_tbl_MemberBalance_Cash]  DEFAULT ((0)) FOR [Cash]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_ChangePass]  DEFAULT ((0)) FOR [ChangePass]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_ChangeSecurePass]  DEFAULT ((0)) FOR [ChangeSecurePass]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_UpdateProfile]  DEFAULT ((0)) FOR [ChangeProfile]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_ChangeBank]  DEFAULT ((0)) FOR [ChangeBank]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_EmailVerified]  DEFAULT ((0)) FOR [Email_Verification_Status]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_KYC_Status]  DEFAULT ((0)) FOR [KYC_Verification_Status]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_Comm]  DEFAULT ((0)) FOR [Comm]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_TrustAccess]  DEFAULT ((0)) FOR [TrustAccess]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_WillAccess]  DEFAULT ((0)) FOR [WillAccess]
GO
ALTER TABLE [dbo].[tbl_MemberControl] ADD  CONSTRAINT [DF_tbl_MemberControl_AllowTrustOverridingCommission]  DEFAULT ((1)) FOR [AllowTrustOverridingCommission]
GO
ALTER TABLE [dbo].[tbl_MemberInfo] ADD  CONSTRAINT [DF_tbl_MemberInfo_AdvanceRanking]  DEFAULT ((0)) FOR [AdvanceRanking]
GO
ALTER TABLE [dbo].[tbl_MemberInfo] ADD  CONSTRAINT [DF_tbl_memberinfo_IsDeleted]  DEFAULT ((0)) FOR [IsDeleted]
GO
ALTER TABLE [dbo].[tbl_MemberInfo] ADD  CONSTRAINT [DF_tbl_memberinfo_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_MemberInfo] ADD  CONSTRAINT [DF_tbl_memberinfo_UpdatedateAt]  DEFAULT (getdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[tbl_MemberInfo_Avatar] ADD  CONSTRAINT [DF_tbl_MemberInfo_Avatar_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_MemberInfo_KYC] ADD  CONSTRAINT [DF_tbl_MemberInfo_KYC_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_MerchantType]  DEFAULT ('A') FOR [MerchantType]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_SecondPassword]  DEFAULT ((0)) FOR [SecondPassword]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_GoogleTwoFactor]  DEFAULT ((0)) FOR [GoogleTwoFactor]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_EmailOTP]  DEFAULT ((0)) FOR [EmailOTP]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_PhoneOTP]  DEFAULT ((0)) FOR [PhoneOTP]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_AgentID]  DEFAULT ((0)) FOR [AgentID]
GO
ALTER TABLE [dbo].[tbl_Merchant] ADD  CONSTRAINT [DF_tbl_Merchant_AntiPhishingCode]  DEFAULT ('0') FOR [AntiPhishingCode]
GO
ALTER TABLE [dbo].[tbl_Merchant_Sms] ADD  CONSTRAINT [DF_tbl_Merchant_Sms_Balance]  DEFAULT ((0)) FOR [Balance]
GO
ALTER TABLE [dbo].[tbl_Merchant_Sms] ADD  CONSTRAINT [DF_tbl_Merchant_Sms_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_OpenAiModelPricing] ADD  CONSTRAINT [DF_OpenAiModelPricing_Currency]  DEFAULT ('USD') FOR [Currency]
GO
ALTER TABLE [dbo].[tbl_OpenAiModelPricing] ADD  CONSTRAINT [DF_OpenAiModelPricing_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_OpenAiModelPricing] ADD  CONSTRAINT [DF_OpenAiModelPricing_EffectiveFrom]  DEFAULT (getdate()) FOR [EffectiveFrom]
GO
ALTER TABLE [dbo].[tbl_OpenAiModelPricing] ADD  CONSTRAINT [DF_OpenAiModelPricing_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_OpenAiRequestLog] ADD  CONSTRAINT [DF_OpenAiRequestLog_CostCalculated]  DEFAULT ((0)) FOR [CostCalculated]
GO
ALTER TABLE [dbo].[tbl_OpenAiRequestLog] ADD  CONSTRAINT [DF_OpenAiRequestLog_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Reference] ADD  CONSTRAINT [DF_tbl_Reference_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_RegistrationSession] ADD  DEFAULT (newsequentialid()) FOR [SessionID]
GO
ALTER TABLE [dbo].[tbl_RegistrationSession] ADD  DEFAULT ('ACTIVE') FOR [Status]
GO
ALTER TABLE [dbo].[tbl_RegistrationSession] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Relationship] ADD  CONSTRAINT [DF_tbl_Relationship_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Religion] ADD  CONSTRAINT [DF_tbl_Religion_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_RememberMeToken] ADD  DEFAULT (getdate()) FOR [CreatedDate]
GO
ALTER TABLE [dbo].[tbl_RememberMeToken] ADD  DEFAULT ((0)) FOR [IsRevoked]
GO
ALTER TABLE [dbo].[tbl_ResetPassword] ADD  CONSTRAINT [DF_tbl_ResetPassword_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Resource] ADD  CONSTRAINT [DF_tbl_Resource_ResourceID]  DEFAULT (newsequentialid()) FOR [PublicID]
GO
ALTER TABLE [dbo].[tbl_Resource] ADD  CONSTRAINT [DF__tbl_Resou__Statu__4AEDF071]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Resource] ADD  CONSTRAINT [DF__tbl_Resou__Creat__4BE214AA]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Resource] ADD  CONSTRAINT [DF__tbl_Resou__IsDel__4CD638E3]  DEFAULT ((0)) FOR [IsDeleted]
GO
ALTER TABLE [dbo].[tbl_ResourceCategory] ADD  DEFAULT ((0)) FOR [Sort]
GO
ALTER TABLE [dbo].[tbl_ResourceCategory] ADD  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_ResourceCategory] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_ResourceCategory] ADD  DEFAULT ((0)) FOR [IsDeleted]
GO
ALTER TABLE [dbo].[tbl_ResourceRole] ADD  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Role] ADD  CONSTRAINT [DF_tbl_Role_IsDeleted]  DEFAULT ((0)) FOR [IsDeleted]
GO
ALTER TABLE [dbo].[tbl_Role] ADD  CONSTRAINT [DF_tbl_Role_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_Role] ADD  CONSTRAINT [DF_tbl_Role_CreatedBy]  DEFAULT ((0)) FOR [CreatedBy]
GO
ALTER TABLE [dbo].[tbl_Role] ADD  CONSTRAINT [DF_tbl_Role_UpdatedAt]  DEFAULT (getdate()) FOR [UpdatedAt]
GO
ALTER TABLE [dbo].[tbl_Role] ADD  CONSTRAINT [DF_tbl_Role_UpdatedBy]  DEFAULT ((0)) FOR [UpdatedBy]
GO
ALTER TABLE [dbo].[tbl_Sms_History] ADD  CONSTRAINT [DF_tbl_Sms_History_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_TrustApplication] ADD  CONSTRAINT [DF_tbl_TrustApplication_HasCaretakerDistribution]  DEFAULT ((0)) FOR [HasCaretakerDistribution]
GO
ALTER TABLE [dbo].[tbl_TrustApplication] ADD  CONSTRAINT [DF_TrustApplication_Status]  DEFAULT ('DRAFT') FOR [ApplicationStatus]
GO
ALTER TABLE [dbo].[tbl_TrustApplication] ADD  CONSTRAINT [DF_TrustApplication_CurrentStep]  DEFAULT ((1)) FOR [CurrentStep]
GO
ALTER TABLE [dbo].[tbl_TrustApplication] ADD  CONSTRAINT [DF_TrustApplication_LastCompletedStep]  DEFAULT ((0)) FOR [LastCompletedStep]
GO
ALTER TABLE [dbo].[tbl_TrustApplication] ADD  CONSTRAINT [DF_TrustApplication_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Beneficiary] ADD  CONSTRAINT [DF_TrustApplicationBeneficiary_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Beneficiary] ADD  CONSTRAINT [DF_TrustApplicationBeneficiary_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocation] ADD  CONSTRAINT [DF_TrustApplicationAllocation_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail] ADD  CONSTRAINT [DF_TrustApplicationAllocationDetail_Trustee]  DEFAULT ((0)) FOR [IsTrusteeCompany]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail] ADD  CONSTRAINT [DF_TrustApplicationAllocationDetail_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker] ADD  CONSTRAINT [DF_TrustApplication_Caretaker_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker] ADD  CONSTRAINT [DF_TrustApplication_Caretaker_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_CoBroker] ADD  CONSTRAINT [DF_TrustApplicationCoBroker_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule] ADD  CONSTRAINT [DF_tbl_TrustApplication_DividendSchedule_BonusAmount]  DEFAULT ((0)) FOR [BonusAmount]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule] ADD  CONSTRAINT [DF_tbl_TrustApplication_DividendSchedule_PayoutAmount]  DEFAULT ((0)) FOR [PayoutAmount]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule] ADD  CONSTRAINT [DF_tbl_TrustApplication_DividendSchedule_RedepositAmount]  DEFAULT ((0)) FOR [RedepositAmount]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] ADD  CONSTRAINT [DF_tbl_TrustApplicationGeneratedDocument_GenerationStatus]  DEFAULT ('PENDING') FOR [GenerationStatus]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] ADD  CONSTRAINT [DF_tbl_TrustApplicationGeneratedDocument_RetryCount]  DEFAULT ((0)) FOR [RetryCount]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] ADD  CONSTRAINT [DF_tbl_TrustApplicationGeneratedDocument_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] ADD  CONSTRAINT [DF_tbl_TrustApplicationGeneratedDocument_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution] ADD  CONSTRAINT [DF_TrustApplication_MinorDistribution_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] ADD  CONSTRAINT [DF_TrustApplicationPayment_Status]  DEFAULT ('PENDING') FOR [PaymentStatus]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] ADD  CONSTRAINT [DF_TrustApplicationPayment_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] ADD  CONSTRAINT [DF_TrustApplicationPayment_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PaymentDocument] ADD  CONSTRAINT [DF_TrustApplicationPaymentDocument_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PaymentDocument] ADD  CONSTRAINT [DF_TrustApplicationPaymentDocument_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PersonalDetail] ADD  CONSTRAINT [DF_TrustApplicationPersonal_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SourceOfFund] ADD  CONSTRAINT [DF_TrustApplicationSOF_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_StatusHistory] ADD  CONSTRAINT [DF_tbl_TrustApplication_StatusHistory_ChangedAt]  DEFAULT (getdate()) FOR [ChangedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SupportingDocument] ADD  CONSTRAINT [DF_TrustApplicationSupportingDocument_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SupportingDocument] ADD  CONSTRAINT [DF_TrustApplicationSupportingDocument_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustAsset] ADD  CONSTRAINT [DF_TrustApplicationTrustAsset_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustDeedExecution] ADD  CONSTRAINT [DF_TrustApplicationTrustDeedExecution_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustCategories] ADD  CONSTRAINT [DF_tbl_TrustCategories_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_GenerateAutomatically]  DEFAULT ((0)) FOR [GenerateAutomatically]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_GenerateOnDemand]  DEFAULT ((0)) FOR [GenerateOnDemand]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_GenerationOrder]  DEFAULT ((0)) FOR [GenerationOrder]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_Sort]  DEFAULT ((0)) FOR [Sort]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_TrustDocument] ADD  CONSTRAINT [DF_tbl_TrustDocument_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentAllocationMapping] ADD  CONSTRAINT [DF_tbl_TrustDocumentAllocationMapping_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentAllocationMapping] ADD  CONSTRAINT [DF_tbl_TrustDocumentAllocationMapping_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentRole] ADD  CONSTRAINT [DF_tbl_TrustDocumentRole_CanView]  DEFAULT ((0)) FOR [CanView]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentRole] ADD  CONSTRAINT [DF_tbl_TrustDocumentRole_CanDownload]  DEFAULT ((0)) FOR [CanDownload]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentRole] ADD  CONSTRAINT [DF_tbl_TrustDocumentRole_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentTemplate] ADD  CONSTRAINT [DF_tbl_TrustDocumentTemplate_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentTemplate] ADD  CONSTRAINT [DF_tbl_TrustDocumentTemplate_CreatedAt]  DEFAULT (getdate()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[tbl_TrustPlan] ADD  CONSTRAINT [DF_tbl_TrustPlan_HasComplimentaryBenefits]  DEFAULT ((0)) FOR [HasComplimentaryBenefits]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Asset_Allocation] ADD  CONSTRAINT [DF_tbl_Type_Of_Asset_Allocation_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Executor] ADD  CONSTRAINT [DF_tbl_Type_Of_Executor_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Identity] ADD  CONSTRAINT [DF_tbl_Type_Of_Identity_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Land] ADD  CONSTRAINT [DF_tbl_Type_Of_Land_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Payment_To_Trustee] ADD  CONSTRAINT [DF_tbl_Type_Of_Payment_To_Trustee_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Property] ADD  CONSTRAINT [DF_tbl_Type_Of_Property_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_Type_Of_Title] ADD  CONSTRAINT [DF_tbl_Type_Of_Title_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_UnitTrust_Account_Type] ADD  CONSTRAINT [DF_tbl_UnitTrust_Account_Type_Status]  DEFAULT ((0)) FOR [Status]
GO
ALTER TABLE [dbo].[tbl_WalletCash] ADD  CONSTRAINT [DF_tbl_WalletCash_Debit]  DEFAULT ((0)) FOR [Debit]
GO
ALTER TABLE [dbo].[tbl_WalletCash] ADD  CONSTRAINT [DF_tbl_WalletCash_Credit]  DEFAULT ((0)) FOR [Credit]
GO
ALTER TABLE [dbo].[tbl_WalletCash] ADD  CONSTRAINT [DF_tbl_WalletCash_NType]  DEFAULT ('CASH') FOR [NType]
GO
ALTER TABLE [dbo].[tbl_Resource]  WITH CHECK ADD  CONSTRAINT [FK_tbl_Resource_Category] FOREIGN KEY([MerchantID], [CategoryCode])
REFERENCES [dbo].[tbl_ResourceCategory] ([MerchantID], [CategoryCode])
GO
ALTER TABLE [dbo].[tbl_Resource] CHECK CONSTRAINT [FK_tbl_Resource_Category]
GO
ALTER TABLE [dbo].[tbl_Resource]  WITH CHECK ADD  CONSTRAINT [FK_tbl_Resource_FileUploadAudit] FOREIGN KEY([FileUploadAuditID])
REFERENCES [dbo].[tbl_FileUploadAudit] ([RowID])
GO
ALTER TABLE [dbo].[tbl_Resource] CHECK CONSTRAINT [FK_tbl_Resource_FileUploadAudit]
GO
ALTER TABLE [dbo].[tbl_ResourceRole]  WITH CHECK ADD  CONSTRAINT [FK_tbl_ResourceRole_Resource] FOREIGN KEY([ResourceID])
REFERENCES [dbo].[tbl_Resource] ([RowID])
GO
ALTER TABLE [dbo].[tbl_ResourceRole] CHECK CONSTRAINT [FK_tbl_ResourceRole_Resource]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Beneficiary]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationBeneficiary_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Beneficiary] CHECK CONSTRAINT [FK_TrustApplicationBeneficiary_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocation]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationAllocation_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocation] CHECK CONSTRAINT [FK_TrustApplicationAllocation_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationAllocationDetail_Allocation] FOREIGN KEY([AllocationID])
REFERENCES [dbo].[tbl_TrustApplication_BeneficiaryAllocation] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail] CHECK CONSTRAINT [FK_TrustApplicationAllocationDetail_Allocation]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationAllocationDetail_Beneficiary] FOREIGN KEY([BeneficiaryID])
REFERENCES [dbo].[tbl_TrustApplication_Beneficiary] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_BeneficiaryAllocationDetail] CHECK CONSTRAINT [FK_TrustApplicationAllocationDetail_Beneficiary]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplication_Caretaker_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker] CHECK CONSTRAINT [FK_TrustApplication_Caretaker_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_CoBroker]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationCoBroker_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_CoBroker] CHECK CONSTRAINT [FK_TrustApplicationCoBroker_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplication_DividendSchedule_TrustApplication] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule] CHECK CONSTRAINT [FK_tbl_TrustApplication_DividendSchedule_TrustApplication]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] CHECK CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Document] FOREIGN KEY([TrustDocumentID])
REFERENCES [dbo].[tbl_TrustDocument] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] CHECK CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Document]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Template] FOREIGN KEY([TrustDocumentTemplateID])
REFERENCES [dbo].[tbl_TrustDocumentTemplate] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_GeneratedDocument] CHECK CONSTRAINT [FK_tbl_TrustApplicationGeneratedDocument_Template]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_History]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplication_History_TrustApplication] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_History] CHECK CONSTRAINT [FK_tbl_TrustApplication_History_TrustApplication]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplication_MinorDistribution_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution] CHECK CONSTRAINT [FK_TrustApplication_MinorDistribution_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationPayment_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] CHECK CONSTRAINT [FK_TrustApplicationPayment_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PaymentDocument]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationPaymentDocument_Payment] FOREIGN KEY([PaymentID])
REFERENCES [dbo].[tbl_TrustApplication_Payment] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PaymentDocument] CHECK CONSTRAINT [FK_TrustApplicationPaymentDocument_Payment]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PersonalDetail]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationPersonal_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PersonalDetail] CHECK CONSTRAINT [FK_TrustApplicationPersonal_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PlanSnapshot]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplication_PlanSnapshot_TrustApplication] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_PlanSnapshot] CHECK CONSTRAINT [FK_tbl_TrustApplication_PlanSnapshot_TrustApplication]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SourceOfFund]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationSOF_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SourceOfFund] CHECK CONSTRAINT [FK_TrustApplicationSOF_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_StatusHistory]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustApplication_StatusHistory_TrustApplication] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_StatusHistory] CHECK CONSTRAINT [FK_tbl_TrustApplication_StatusHistory_TrustApplication]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SupportingDocument]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationSupportingDocument_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_SupportingDocument] CHECK CONSTRAINT [FK_TrustApplicationSupportingDocument_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustAsset]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationTrustAsset_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustAsset] CHECK CONSTRAINT [FK_TrustApplicationTrustAsset_Application]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustDeedExecution]  WITH CHECK ADD  CONSTRAINT [FK_TrustApplicationTrustDeedExecution_Application] FOREIGN KEY([TrustApplicationID])
REFERENCES [dbo].[tbl_TrustApplication] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustApplication_TrustDeedExecution] CHECK CONSTRAINT [FK_TrustApplicationTrustDeedExecution_Application]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentAllocationMapping]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustDocumentAllocationMapping_TrustDocument] FOREIGN KEY([TrustDocumentID])
REFERENCES [dbo].[tbl_TrustDocument] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustDocumentAllocationMapping] CHECK CONSTRAINT [FK_tbl_TrustDocumentAllocationMapping_TrustDocument]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentRole]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustDocumentRole_TrustDocument] FOREIGN KEY([TrustDocumentID])
REFERENCES [dbo].[tbl_TrustDocument] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustDocumentRole] CHECK CONSTRAINT [FK_tbl_TrustDocumentRole_TrustDocument]
GO
ALTER TABLE [dbo].[tbl_TrustDocumentTemplate]  WITH CHECK ADD  CONSTRAINT [FK_tbl_TrustDocumentTemplate_TrustDocument] FOREIGN KEY([TrustDocumentID])
REFERENCES [dbo].[tbl_TrustDocument] ([RowID])
GO
ALTER TABLE [dbo].[tbl_TrustDocumentTemplate] CHECK CONSTRAINT [FK_tbl_TrustDocumentTemplate_TrustDocument]
GO
ALTER TABLE [HangFire].[JobParameter]  WITH CHECK ADD  CONSTRAINT [FK_HangFire_JobParameter_Job] FOREIGN KEY([JobId])
REFERENCES [HangFire].[Job] ([Id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [HangFire].[JobParameter] CHECK CONSTRAINT [FK_HangFire_JobParameter_Job]
GO
ALTER TABLE [HangFire].[State]  WITH CHECK ADD  CONSTRAINT [FK_HangFire_State_Job] FOREIGN KEY([JobId])
REFERENCES [HangFire].[Job] ([Id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [HangFire].[State] CHECK CONSTRAINT [FK_HangFire_State_Job]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker]  WITH CHECK ADD  CONSTRAINT [CK_TrustApplication_Caretaker_Type] CHECK  (([CaretakerType]='SUBSTITUTE' OR [CaretakerType]='MAIN'))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Caretaker] CHECK CONSTRAINT [CK_TrustApplication_Caretaker_Type]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule]  WITH CHECK ADD  CONSTRAINT [CK_tbl_TrustApplication_DividendSchedule_Status] CHECK  (([Status]='CANCELLED' OR [Status]='PAID' OR [Status]='SCHEDULED'))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_DividendSchedule] CHECK CONSTRAINT [CK_tbl_TrustApplication_DividendSchedule_Status]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution]  WITH CHECK ADD  CONSTRAINT [CK_TrustApplication_MinorDistribution_Method] CHECK  (([DistributionMethod]='TRUSTEE_HOLD' OR [DistributionMethod]='GUARDIAN'))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution] CHECK CONSTRAINT [CK_TrustApplication_MinorDistribution_Method]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution]  WITH CHECK ADD  CONSTRAINT [CK_TrustApplication_MinorDistribution_ReleaseAge] CHECK  (([DistributionMethod]='GUARDIAN' AND [ReleaseAge] IS NULL OR [DistributionMethod]='TRUSTEE_HOLD' AND [ReleaseAge] IS NOT NULL))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_MinorDistribution] CHECK CONSTRAINT [CK_TrustApplication_MinorDistribution_ReleaseAge]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment]  WITH CHECK ADD  CONSTRAINT [CK_TrustApplicationPayment_Amount] CHECK  (([PaymentAmount]>(0)))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] CHECK CONSTRAINT [CK_TrustApplicationPayment_Amount]
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment]  WITH CHECK ADD  CONSTRAINT [CK_TrustApplicationPayment_Status] CHECK  (([PaymentStatus]='REJECTED' OR [PaymentStatus]='APPROVED' OR [PaymentStatus]='PENDING'))
GO
ALTER TABLE [dbo].[tbl_TrustApplication_Payment] CHECK CONSTRAINT [CK_TrustApplicationPayment_Status]
GO
