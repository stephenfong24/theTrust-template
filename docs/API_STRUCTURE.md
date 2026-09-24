# theTrust API Structure

This document records the API structure found in `reference/api.zip`,
`reference/api-202609140508.zip`, and `reference/scheme_trust_1.0.sql`.

Use this as the implementation guide when wiring the frontend to the real API.
All API calls must be centralized through `src/api/apiClient.ts` and domain API
wrappers under `src/api/`.

## Source Layout

Reference backend source:

- `reference/api_src/API/Controller/v1/` - active Web API controllers.
- `reference/api_202609140508_src/api/API/Controller/v1/` - extracted source
  from the 2026-09-14 05:08 API zip update.
- `reference/api_src/Class/Model/DTO/` - request and response DTOs.
- `reference/api_src/Class/Service/` - business services.
- `reference/api_src/Context/` - Entity Framework table mappings.
- `reference/scheme_trust_1.0.sql` - SQL Server schema.

The `reference/` folder is documentation/reference material only. Do not edit
files under `reference/` when wiring frontend behavior or recording API updates;
record updates in Markdown docs and implement frontend calls under `src/`.

The backend is an ASP.NET Web API application using attribute routes from
`WebApiConfig.Register()` via `config.MapHttpAttributeRoutes()`.

## API Client Rule

Do not call `fetch`, `axios`, or raw endpoint URLs directly from pages,
components, hooks, or services.

All HTTP traffic to this API must follow this pattern:

1. `src/api/apiClient.ts` owns the shared Axios instance.
2. `apiClient` owns the base URL, auth token injection, loading lifecycle, error
   normalization, and session-expiry handling.
3. Feature modules call domain wrappers such as `authApi`, `agentApi`,
   `trustApi`, `resourceApi`, `networkApi`, or new wrappers created under
   `src/api/`.
4. Pages and components import only the domain wrapper, never `axios` directly.
5. JSON requests should use `withJsonContentType(data)`.
6. `FormData` and multipart uploads should be passed directly to `apiClient`;
   do not force a JSON content type.

Example:

```ts
import apiClient, { withJsonContentType } from "./apiClient";

export const trustApplicationApi = {
  async saveStep1(data: TrustApplicationStep1Request) {
    const response = await apiClient.post(
      "/trust-application/step-1",
      data,
      withJsonContentType(data)
    );
    return response.data;
  }
};
```

## Base URL

The frontend `apiClient` uses:

```ts
baseURL: import.meta.env.VITE_API_URL
```

Configure `VITE_API_URL` so paths below resolve correctly. If the real backend
is hosted with `/api` in the base URL, use:

```env
VITE_API_URL=https://example.com/api
```

Then frontend wrapper paths should omit the leading `/api`, for example
`/auth/login`.

If `VITE_API_URL` does not include `/api`, wrapper paths must include `/api`.
Prefer including `/api` in `VITE_API_URL` to keep wrapper paths short and
consistent.

## Response Envelope

Most successful endpoints return:

```json
{
  "Status": 0,
  "Message": "Success",
  "Code": "ACTION-CODE",
  "Data": {}
}
```

Business validation errors return HTTP 400:

```json
{
  "Status": 4,
  "Message": "Error message",
  "Code": "ACTION-CODE",
  "Data": null
}
```

JWT/authentication failures return HTTP 401:

```json
{
  "Status": 401,
  "Message": "Invalid or missing token.",
  "Code": "TOKEN_MISSING"
}
```

Note: `Response.Status` has a stale comment in the backend saying `1 = success`,
but the actual helper returns `Status = 0` for success and `Status = 4` for
failure. Follow the runtime behavior.

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

`JwtAuthorizeAttribute` reads the token, validates it, then places these values
into the backend request context:

- `UserID`
- `MerchantID`

Some endpoints are `[AllowAnonymous]` even though their controller has
`[JwtAuthorize]`.

## Auth Endpoints

### `POST /api/auth/login`

Anonymous.

Request:

```json
{
  "Username": "user@example.com",
  "Password": "password",
  "MerchantID": "MERCHANT",
  "RememberMe": true
}
```

Response `Data`:

- `Token`
- `SignalRToken`
- `RememberMeToken`
- `UserId`
- `DisplayName`
- `UserName`
- `Name`
- `Email`
- `AvatarUrl`
- `Role`
- `RoleName`
- `Ranking`
- `RankName`
- `Country`
- `Country_Domain`
- `JoinDate`
- `LastLogin`
- `SponsorID`
- `SponsorName`
- `ReferralCode`
- `Redirects`
- `Access`

### `POST /api/auth/remember-login`

Anonymous.

Request:

```json
{
  "RememberMeToken": "guid",
  "MerchantID": "MERCHANT"
}
```

Response is the same login response shape as `/auth/login`.

### `POST /api/auth/logout`

Protected.

Revokes active remember-me tokens for the current user and removes the app token.

## Account Endpoints

### `POST /api/account/change-login-password`

Protected.

Request:

```json
{
  "OldPassword": "old",
  "Password": "new",
  "ConfirmPassword": "new"
}
```

### `POST /api/account/request-reset-password`

Anonymous.

Request:

```json
{
  "Username": "user@example.com",
  "MerchantID": "MERCHANT"
}
```

### `POST /api/account/reset-password`

Anonymous.

Request:

```json
{
  "MerchantID": "MERCHANT",
  "UniqueID": "reset-token",
  "NewLoginPassword": "new",
  "ConfirmLoginPassword": "new"
}
```

### `GET /api/account/get-profile`

Protected.

Response `Data` includes profile, bank, identity document, referral, and
activity fields:

- `ReferralID`
- `AvatarUrl`
- `CountryMobileCode`
- `Mobile`
- `Email`
- `Fullname`
- `DateOfBirth`
- `IdentityType`
- `IdentityID`
- `Country`
- `Country_Domain`
- `Postcode`
- `City`
- `State`
- `Address_1`
- `Address_2`
- `Occupation`
- `TinNumber`
- `LastChangePasswordDate`
- `TotalReferrals`
- `BankName`
- `BankNameDetail`
- `AccountName`
- `AccountNumber`
- `SwiftCode`
- `IcFront`
- `IcBack`
- `Passport`
- `SsmCertificate`
- `Activities`

### `POST /api/account/change-profile`

Protected. Agent role.

Request:

```json
{
  "DateOfBirth": "yyyy-MM-dd",
  "CountryMobileCode": "60",
  "Mobile": "123456789",
  "Country_Domain": "MY",
  "Postcode": "50000",
  "State": "Kuala Lumpur",
  "City": "Kuala Lumpur",
  "Address_1": "Address line 1",
  "Address_2": "Address line 2",
  "Occupation": "Occupation",
  "TinNumber": "TIN",
  "BankName": "Bank code/name",
  "AccountName": "Account holder",
  "AccountNumber": "Account number"
}
```

### `POST /api/account/upload-avatar`

Protected. Multipart single-file upload.

Response `Data`:

- `FileUrl`
- `UploadedFile`

## Registration Endpoints

### `GET /api/register/validate-sponsor`

Anonymous.

Use this before or during signup when the UI needs to validate a referral code
and display the sponsor name.

Query parameters:

| Name | Required | Notes |
| --- | --- | --- |
| `merchantId` | Yes | Use `VITE_MERCHANT_ID`. Backend expects lowercase `merchantId` for this endpoint. |
| `sponsor` | Yes | Referral code. Backend trims whitespace before lookup. |

Success response:

```json
{
  "Status": 0,
  "Message": "Success",
  "Code": "VALIDATE-SPONSOR",
  "Data": {
    "Fullname": "Sponsor Full Name"
  }
}
```

Validation failures return HTTP 200 with `Status: 4`, `Code:
"VALIDATE-SPONSOR"`, and `Data: null`.

Known failure messages:

- Invalid merchant message from `ValidationAsync.isValidMerchant`.
- `Referral code is required.`
- `Invalid referral code.`

### `POST /api/register/registration/session`

Anonymous.

Request:

```json
{
  "ReferralCode": "REFCODE"
}
```

Response `Data`:

- `RegistrationToken`
- `ExpiresAt`
- `ReferralCode`

### `POST /api/register/validate-account`

Anonymous.

Request:

```json
{
  "MerchantID": "MERCHANT",
  "Sponsor": "sponsor/referral",
  "Email": "user@example.com",
  "OTP": "123456",
  "LoginPassword": "password",
  "ConfirmLoginPassword": "password"
}
```

### `POST /api/register/validate-identity`

Anonymous.

Request:

```json
{
  "IdentityType": "NRIC",
  "IdentityId": "identity number",
  "Fullname": "Full Name",
  "DateOfBirth": "yyyy-MM-dd",
  "TinNumber": "TIN",
  "Occupation": "Occupation"
}
```

### `POST /api/register/validate-contact`

Anonymous.

Request:

```json
{
  "Country_Domain": "MY",
  "CountryMobileCode": "60",
  "Mobile": "123456789",
  "Postcode": "50000",
  "State": "Kuala Lumpur",
  "City": "Kuala Lumpur",
  "Address_1": "Address line 1",
  "Address_2": "Address line 2"
}
```

### `POST /api/register/validate-bank`

Anonymous.

Request:

```json
{
  "BankName": "Bank code/name",
  "AccountName": "Account holder",
  "AccountNumber": "Account number"
}
```

### `POST /api/register/upload-kyc`

Anonymous. Multipart single-file upload.

Use `src/api/registerApi.ts`; pages should not call this endpoint directly.

Create or reuse a registration session with `POST
/api/register/registration/session` before uploading. Send the returned
`RegistrationToken` in the `X-Registration-Token` header.

Query parameters:

- `merchantId`
- `documentType`: `NRIC_FRONT`, `NRIC_BACK`, `PASSPORT`, or `SSM_CERT`

Header:

```http
X-Registration-Token: <RegistrationToken>
```

Response `Data`:

- `PublicID`
- `FileUrl`
- `UploadedFile`

Store the returned `PublicID` for the final `agent-register` request:

- `NRIC_FRONT` -> `IdentityFrontPublicID`
- `NRIC_BACK` -> `IdentityBackPublicID`
- `PASSPORT` -> `PassportPublicID`
- `SSM_CERT` -> `SSMPublicID`

### `POST /api/register/agent-register`

Anonymous.

Request:

```json
{
  "MerchantID": "MERCHANT",
  "RoleCode": "AG",
  "Sponsor": "sponsor/referral",
  "CountryMobileCode": "60",
  "Mobile": "123456789",
  "Username": "user@example.com",
  "Fullname": "Full Name",
  "DateOfBirth": "yyyy-MM-dd",
  "IdentityType": "NRIC",
  "IdentityID": "identity number",
  "Address_1": "Address line 1",
  "Address_2": "Address line 2",
  "Postcode": "50000",
  "State": "Kuala Lumpur",
  "City": "Kuala Lumpur",
  "Country_Domain": "MY",
  "Occupation": "Occupation",
  "TinNumber": "TIN",
  "LoginPassword": "password",
  "ConfirmLoginPassword": "password",
  "BankName": "Bank code/name",
  "AccountName": "Account holder",
  "AccountNumber": "Account number",
  "IdentityFrontPublicID": "guid",
  "IdentityBackPublicID": "guid",
  "PassportPublicID": "guid",
  "SSMPublicID": "guid",
  "OTP": "123456"
}
```

## Service Endpoints

### `POST /api/service/send-otp`

Anonymous.

Use `src/api/serviceApi.ts`; pages should not call this endpoint directly.

Request:

```json
{
  "MerchantID": "MERCHANT",
  "UserID": 0,
  "ActionType": "TRUST_MEMBER_REGISTRATION",
  "SendMethod": "OTP_MAIL",
  "ReceiverAddress": "user@example.com"
}
```

The 2026-09-14 API source validates OTP action names with the `TRUST_` prefix,
including `TRUST_MEMBER_REGISTRATION`, `TRUST_RESET_PASSWORD`, and
`TRUST_SHARED_PROFILE`.

## Lookup Endpoints

Most lookup endpoints are anonymous and accept a merchant parameter.

Frontend lookup API calls must be centralized in `src/api/lookupApi.ts`.
Pages/components should import `lookupApi` and must not call lookup endpoints
directly.

`lookupApi` owns:

- `VITE_MERCHANT_ID` lookup.
- Merchant query parameter construction.
- Backend response envelope checks.
- Shared TypeScript interfaces for lookup rows.

Example:

```ts
import { lookupApi } from "../api/lookupApi";

const { countries, banks, mobileCodes, nationalities } =
  await lookupApi.getSignupLookupData();
```

Use `lookupApi.getSignupLookupData()` for signup forms that need countries,
mobile codes, nationalities, and banks together.

Use query parameter names exactly as the backend expects. Many lookup endpoints
use `MerchantID` with uppercase `ID`; role/rank/trust categories use
`merchantId`.

| Method | Endpoint | Query | Response Data Key |
| --- | --- | --- | --- |
| GET | `/api/lookup/bank-list` | `MerchantID` | `BankLists` |
| GET | `/api/lookup/country-list` | `MerchantID` | `CountryLists` |
| GET | `/api/lookup/relationship-list` | `MerchantID` | `RelationshipLists` |
| GET | `/api/lookup/property-type-list` | `MerchantID` | `PropertyTypeLists` |
| GET | `/api/lookup/land-type-list` | `MerchantID` | `LandTypeLists` |
| GET | `/api/lookup/bank-account-type-list` | `MerchantID` | `BankAccountTypeLists` |
| GET | `/api/lookup/title-type-list` | `MerchantID` | `TitleTypeLists` |
| GET | `/api/lookup/unit-trust-account-type-list` | `MerchantID` | `UnitTrustAccountTypeLists` |
| GET | `/api/lookup/funeral-method-list` | `MerchantID` | `FuneralMethodLists` |
| GET | `/api/lookup/identity-type-list` | `MerchantID` | `IdentityTypeLists` |
| GET | `/api/lookup/executor-type-list` | `MerchantID` | `ExecutorTypeLists` |
| GET | `/api/lookup/asset-allocation-type-list` | `MerchantID` | `AssetAllocationTypeLists` |
| GET | `/api/lookup/religion-list` | `MerchantID` | `ReligionLists` |
| GET | `/api/lookup/payment-to-trustee-type-list` | `MerchantID` | `PaymentToTrusteeTypeLists` |
| GET | `/api/lookup/role-list` | `merchantId`, `admin` | role list |
| GET | `/api/lookup/rank-list` | `merchantId` | rank list |
| GET | `/api/lookup/trust-categories-list` | `merchantId` | trust category list |

### Country Lookup

Use `lookupApi.getCountryList()`.

Endpoint:

```http
GET /api/lookup/country-list?MerchantID=<merchant>
```

Returned rows include:

- `id`
- `CountryName`
- `CountryDomain`
- `CountryMobileCode`
- `Nationality`
- `UTCoffSet`

Use this single response for country dropdowns, mobile-code dropdowns, and
nationality options. Do not create hardcoded country, mobile-code, or
nationality sample arrays in pages.

### Bank Lookup

Use `lookupApi.getBankList()`.

Endpoint:

```http
GET /api/lookup/bank-list?MerchantID=<merchant>
```

Returned rows include:

- `id`
- `BankName`
- `BankDescription`

Use this response for bank dropdown options. Do not create hardcoded bank sample
arrays in pages.

## Administrator Endpoints

All administrator endpoints are protected and require `SA` or `AD` unless noted.

### `POST /api/administrator/add`

Request uses `AdministratorAsync`:

```json
{
  "Username": "admin@example.com",
  "Fullname": "Admin Name",
  "RoleCode": "AD",
  "LoginPassword": "password",
  "ConfirmLoginPassword": "password",
  "WillAccess": 0,
  "LoginStatus": 1
}
```

Backend fills `MerchantID`, `CreatedBy`, and forces `TrustAccess = 1`.

### `PUT /api/administrator/edit/{id}`

Request uses the same `AdministratorAsync` fields. Backend fills `UserID` from
route `{id}`, `MerchantID`, and `CreatedBy`.

### `POST /api/administrator/change-profile`

Request:

```json
{
  "Username": "admin@example.com",
  "Fullname": "Admin Name"
}
```

### `DELETE /api/administrator/delete`

Request:

```json
{
  "Username": "admin@example.com"
}
```

### `GET /api/administrator/administrator-list`

Query:

- `page`
- `pageSize`
- `search`
- `roleCode`
- `status`

Response `Data`:

- `AdministratorLists`
- `Pagination`

## Agent Management Endpoints

Protected. Back-office roles vary by endpoint.

### `POST /api/agent-management/change-login-password`

Roles: `SA`, `AD`, `OP`.

Request:

```json
{
  "UserID": 123,
  "OldPassword": "old",
  "Password": "new",
  "ConfirmPassword": "new",
  "CreatedBy": "456"
}
```

### `POST /api/agent-management/change-profile`

Roles: `SA`, `AD`, `OP`.

Request:

```json
{
  "UserID": 123,
  "Username": "agent@example.com",
  "Fullname": "Agent Name",
  "DateOfBirth": "yyyy-MM-dd",
  "CountryMobileCode": "60",
  "Mobile": "123456789",
  "Country_Domain": "MY",
  "Postcode": "50000",
  "State": "Kuala Lumpur",
  "City": "Kuala Lumpur",
  "Address_1": "Address line 1",
  "Address_2": "Address line 2",
  "Occupation": "Occupation",
  "TinNumber": "TIN",
  "BankName": "Bank code/name",
  "AccountName": "Account holder",
  "AccountNumber": "Account number",
  "LoginStatus": true,
  "CreatedBy": 456
}
```

### `POST /api/agent-management/change-identity`

Roles: `SA`, `AD`, `OP`.

Request:

```json
{
  "UserID": 123,
  "IdentityType": "NRIC",
  "IdentityID": "identity number",
  "IdentityFrontPublicID": "guid",
  "IdentityBackPublicID": "guid",
  "PassportPublicID": "guid",
  "SSMPublicID": "guid",
  "CreatedBy": 456
}
```

### `GET /api/agent-management/get-profile`

Roles: `SA`, `AD`, `OP`, `AC`.

Query:

- `userId`

Response is the same profile shape as `/api/account/get-profile`.

### `POST /api/agent-management/upload-kyc`

Roles: `SA`, `AD`, `OP`. Multipart single-file upload.

Query:

- `merchantId`
- `documentType`: `NRIC_FRONT`, `NRIC_BACK`, `PASSPORT`, or `SSM_CERT`
- `userId`

Response `Data`:

- `PublicID`
- `FileUrl`
- `UploadedFile`

### `GET /api/agent-management/agent-list`

Roles: `SA`, `AD`, `OP`.

Query:

- `page`
- `pageSize`
- `keyword`
- `introducerKeyword`
- `ranking`

Response `Data`:

- `AgentLists`
- `Pagination`

## Network Endpoints

The backend network API has been updated to split Trust and Will downlines into
separate routes. Frontend pages for `Network - The Trust` and
`Network - The Will` should call the category-specific endpoint through
`src/api/networkApi.ts`.

### `GET /api/network/trust/downline-list`

Protected.

Query:

- `email` optional agent email/login. If omitted, the backend returns the
  current user's direct Trust network.

Behavior:

- Requires Trust access through `tbl_Reference.Type == "V"`.
- Agent role `AG` may view only self or Trust downlines below self.
- Uses `tbl_MemberUnit_Trust` for direct downline and child-count lookups.
- Response `Data` contains the selected agent and direct downlines:
  `UserID`, `FullName`, `Username`, `PersonalSales`, `RankName`,
  `TotalDownline`, and `Downlines`.

### `GET /api/network/will/downline-list`

Protected.

Query:

- `email` optional agent email/login. If omitted, the backend returns the
  current user's direct Will network.

Behavior:

- Requires Will access through `tbl_Reference.Type == "W"`.
- Agent role `AG` may view only self or Will downlines below self.
- Uses `tbl_MemberUnit_Will` for direct downline and child-count lookups.
- Response `Data` contains the selected agent and direct downlines:
  `UserID`, `FullName`, `Username`, `PersonalSales`, `RankName`,
  `TotalDownline`, and `Downlines`.

## Trust Application Endpoints

All trust application endpoints are protected.

### `GET /api/trust-application/{trustId}`

Returns all saved application information for steps 1 through 7.

Access rules from backend comments:

- `AG`: own applications only, draft or submitted.
- `SA` / `AD`: submitted/non-draft applications.

### `POST /api/trust-application/step-1`

Creates or updates the trust application personal details.

Request:

```json
{
  "TrustID": null,
  "ProductCode": "PRODUCT",
  "FullName": "Settlor Name",
  "IdentityType": "NRIC",
  "IdentityNo": "identity number",
  "Nationality": "MY",
  "Gender": "M",
  "DateOfBirth": "yyyy-MM-dd",
  "Email": "settlor@example.com",
  "ContactNo": "60123456789",
  "AddressLine1": "Address line 1",
  "AddressLine2": "Address line 2",
  "Postcode": "50000",
  "City": "Kuala Lumpur",
  "State": "Kuala Lumpur",
  "Country": "MY",
  "IsUSTaxPayer": false,
  "HasOtherTaxResidence": false,
  "TaxResidenceCountry": null,
  "TaxIdentificationNo": null,
  "TINUnavailableReason": null,
  "TINUnavailableExplanation": null,
  "EmployerName": "Employer",
  "NatureOfBusiness": "Business",
  "Occupation": "Occupation",
  "AnnualIncomeCode": "CODE",
  "NetWorthCode": "CODE",
  "SourceOfFunds": [
    {
      "SourceCode": "SOURCE",
      "OtherDescription": null
    }
  ]
}
```

Response `Data`:

- `TrustApplicationID`
- `TrustID`
- `TrustNo`
- `ApplicationStatus`
- `CurrentStep`
- `LastCompletedStep`

### `POST /api/trust-application/step-2`

Saves trust asset, settlor bank account, guaranteed return, and payment source.

Request:

```json
{
  "TrustID": 1001,
  "TrustAssetAmount": 10000,
  "SettlorBankName": "BANK",
  "SettlorOtherBankName": null,
  "SettlorBankAccountHolder": "Account Holder",
  "SettlorBankAccountNumber": "123456789",
  "SettlorSwiftCode": "SWIFT",
  "SettlorBankAddress": "Bank address",
  "GuaranteedReturnOption": "OPTION",
  "PaymentSource": "SELF",
  "JointAccountHolderName": null,
  "ThirdPartyName": null,
  "ThirdPartyIdentityNo": null,
  "ThirdPartyRelationship": null,
  "ThirdPartyOtherRelationship": null,
  "ThirdPartyBankName": null,
  "ThirdPartyOtherBankName": null,
  "ThirdPartyBankAccountHolder": null,
  "ThirdPartyBankAccountNumber": null
}
```

### `POST /api/trust-application/step-3`

Saves beneficiaries.

Request:

```json
{
  "TrustID": 1001,
  "Beneficiaries": [
    {
      "BeneficiaryID": null,
      "FullName": "Beneficiary Name",
      "IdentityType": "NRIC",
      "IdentityNo": "identity number",
      "Nationality": "MY",
      "Gender": "F",
      "DateOfBirth": "yyyy-MM-dd",
      "Email": "beneficiary@example.com",
      "ContactNo": "60123456789",
      "RelationshipCode": "CHILD",
      "OtherRelationship": null,
      "AddressLine1": "Address line 1",
      "AddressLine2": "Address line 2",
      "Postcode": "50000",
      "City": "Kuala Lumpur",
      "State": "Kuala Lumpur",
      "Country": "MY",
      "IsUSTaxPayer": false,
      "HasOtherTaxResidence": false,
      "TaxResidenceCountry": null,
      "TaxIdentificationNo": null,
      "TINUnavailableReason": null,
      "TINUnavailableExplanation": null
    }
  ]
}
```

### `POST /api/trust-application/step-4`

Saves beneficiary allocation.

Request:

```json
{
  "TrustID": 1001,
  "AllocationType": 1,
  "MainBeneficiaries": [
    {
      "BeneficiaryID": 1,
      "AllocationPercentage": 100
    }
  ],
  "SubstituteBeneficiaries": []
}
```

### `POST /api/trust-application/step-5`

Saves trust deed execution details.

Request:

```json
{
  "TrustID": 1001,
  "SigningMethod": "METHOD",
  "SpecialCircumstance": "NONE",
  "ReadOverBy": null,
  "ReadOverIdentityNo": null,
  "LanguageOrDialect": null,
  "RelationshipWithSettlor": null,
  "OtherRelationshipWithSettlor": null
}
```

### `POST /api/trust-application/supporting-document`

Multipart single-file upload.

Query:

- `trustId`

Response `Data`:

- `SupportingDocumentID`
- `TrustID`
- `OriginalFileName`
- `FileSize`
- `FileSHA256`
- `FileUrl`
- `UploadedFile`

### `POST /api/trust-application/step-6`

Saves/continues supporting document step.

Request:

```json
{
  "TrustID": 1001
}
```

### `POST /api/trust-application/step-7`

Saves co-broker allocation.

Request:

```json
{
  "TrustID": 1001,
  "CoBrokers": [
    {
      "Email": "cobroker@example.com",
      "AllocationPercentage": 10
    }
  ]
}
```

### `GET /api/trust-application/{trustId}/review`

Response `Data`:

- `TrustApplicationID`
- `TrustID`
- `TrustNo`
- `ProductCode`
- `ApplicationStatus`
- `CurrentStep`
- `LastCompletedStep`
- `PersonalDetails`
- `TrustAsset`
- `Beneficiaries`
- `BeneficiaryAllocation`
- `TrustDeedExecution`
- supporting document records
- co-broker records

### `POST /api/trust-application/submit`

Request:

```json
{
  "TrustID": 1001
}
```

## Trust Plan Endpoints

Trust plan endpoints are protected and require `SA` or `AD`.

### `POST /api/trust-plan/create-trust-plan`

Request:

```json
{
  "GeneratedAt": "2026-09-14T00:00:00Z",
  "Steps": {
    "Step1BasicInformation": {
      "ProductName": "Plan Name",
      "ProductCategory": "CATEGORY",
      "ProductDescription": "Description",
      "MinimumPlacement": 10000,
      "MaximumPlacement": null,
      "FundManagementPeriod": 5,
      "FundManagementPeriodUnit": "YEAR",
      "ProductStatus": "ACTIVE",
      "ExecutionRanks": ["RANK1"]
    },
    "Step2PaymentAndFees": {
      "PaymentConfig": {
        "PaymentFrequency": "ONE_TIME"
      },
      "Fees": [
        {
          "FeeType": "MANAGEMENT",
          "RateType": "PERCENTAGE",
          "Value": 1.5,
          "ChargeTiming": "UPFRONT"
        }
      ]
    },
    "Step3TenureAndWithdrawal": {
      "LockInPeriod": 1,
      "LockInPeriodUnit": "YEAR",
      "AllowEarlyWithdrawal": false,
      "EarlyWithdrawalFeeType": null,
      "EarlyWithdrawalFeeValue": null
    },
    "Step4DividendReturn": {
      "Method": "INVESTMENT_PERIOD_TIER_RATE",
      "MatrixTiers": [
        {
          "MinimumPlacement": 10000,
          "MaximumPlacement": null,
          "YearlyRates": {
            "1": 5,
            "2": 5.5
          }
        }
      ]
    },
    "Step5DividendPayout": {
      "PayoutFrequency": "YEARLY",
      "CalculationStart": "PLACEMENT_DATE",
      "AllowDividendRedeposit": false
    },
    "Step6BonusConfiguration": {
      "HasBonusReturn": false,
      "BonusRules": []
    },
    "Step7CommissionConfiguration": {
      "Enabled": true,
      "Method": "ONE_OFF_COMMISSION",
      "OneOff": {
        "Tiers": [
          {
            "Rank": "RANK1",
            "CommissionType": "PERCENTAGE",
            "Rate": 1
          }
        ]
      }
    },
    "Step8CommissionRules": {
      "CalculationBasis": "PLACEMENT_AMOUNT",
      "RankDetermination": "CURRENT_RANK"
    },
    "Step9ComplimentaryBenefits": {
      "HasComplimentaryBenefits": false,
      "Benefits": []
    }
  }
}
```

Response `Data`:

- `ProductCode`

### `PUT /api/trust-plan/{productCode}`

Same request shape as create.

Response `Data`:

- `ProductCode`

### `GET /api/trust-plan/get-trust-product-list`

Query:

- `Search`
- `ProductCategory`
- `Status`
- `ReturnMethod`
- `CommissionMethod`
- `Page`
- `PageSize`

Response `Data`:

- `TotalRecords`
- `TotalPages`
- `CurrentPage`
- `PageSize`
- `Records`

Each record:

- `ProductCode`
- `ProductName`
- `ProductCategory`
- `ProductCategoryName`
- `MinimumPlacement`
- `FundManagementPeriod`
- `FundManagementPeriodUnit`
- `ReturnMethod`
- `PayoutFrequency`
- `CommissionMethod`
- `ProductStatus`

### `GET /api/trust-plan/get-trust-product-details/{productCode}`

Response `Data`:

- `ProductCode`
- `Steps`

Details use the same step structure as create/update. Step 4 and Step 7 wrap
method-specific details in a `Configuration` object.

## Resource Endpoints

Protected. Management mutations require `SA` or `AD`.

### `GET /api/resource/categories`

Returns resource categories for the current merchant.

### `GET /api/resource/list`

Query:

- `categoryCode`

Returns active resources available to the current user role.

### `GET /api/resource/manage/list`

Query:

- `categoryCode`

Management listing.

### `GET /api/resource/manage/{id}`

Returns one resource detail.

### `POST /api/resource/create`

Multipart form-data.

Fields:

- `categoryCode`
- `name`
- `description`
- `type`: `FILE` or URL-style resource type
- `url`
- `roleCodes`: comma-separated role codes
- `status`
- `startDate`
- `endDate`
- file content when `type = FILE`

Response `Data`:

- `ResourceID`
- `FileUrl`
- `UploadedFile`

### `POST /api/resource/update`

Multipart form-data.

Fields are the same as create, plus:

- `resourceId`

### `POST /api/resource/delete`

Query:

- `id`

## Audit Endpoints

### `GET /api/audit/request-list`

Protected.

Query:

- `page`
- `pageSize`
- `activitykeyword`
- `userkeyword`
- `dateFrom`
- `dateTo`

Response `Data`:

- `AuditLogs`
- `Pagination`

### `GET /api/audit/file-upload-list`

Protected. Roles: `SA`, `AD`, `OP`, `AC`.

Query:

- `page`
- `pageSize`
- `search`
- `moduleCode`
- `uploadType`
- `scanStatus`
- `dateFrom`
- `dateTo`

Response `Data`:

- `FileUploadAuditLists`
- `Pagination`

## Config Endpoints

### `GET /api/config/get-config-list`

Protected.

Returns general configuration for the current merchant.

### `PUT /api/config/update-config`

Protected.

Request is `UpdateConfigRequest` from `ConfigAsync`.

## Main Database Areas

Member and authentication tables:

- `tbl_MemberInfo`
- `tbl_Login`
- `tbl_MemberControl`
- `tbl_Reference`
- `tbl_AppToken`
- `tbl_RememberMeToken`
- `tbl_ResetPassword`
- `tbl_TAC`

Registration and KYC tables:

- `tbl_RegistrationSession`
- `tbl_MemberInfo_KYC`
- `tbl_log_FileUpload`
- `tbl_FileUploadAudit`

Trust application tables:

- `tbl_TrustApplication`
- `tbl_TrustApplication_PersonalDetail`
- `tbl_TrustApplication_SourceOfFund`
- `tbl_TrustApplication_TrustAsset`
- `tbl_TrustApplication_Beneficiary`
- `tbl_TrustApplication_BeneficiaryAllocation`
- `tbl_TrustApplication_BeneficiaryAllocationDetail`
- `tbl_TrustApplication_SupportingDocument`
- `tbl_TrustApplication_TrustDeedExecution`
- `tbl_TrustApplication_CoBroker`

Trust plan tables:

- `tbl_TrustPlan`
- `tbl_TrustPlanExecutionRank`
- `tbl_TrustPlanPaymentConfig`
- `tbl_TrustPlanFee`
- `tbl_TrustPlanWithdrawalConfig`
- `tbl_TrustPlanDividendConfig`
- `tbl_TrustPlanDividendInvestmentPeriodTier`
- `tbl_TrustPlanDividendInvestmentPeriodTierRate`
- `tbl_TrustPlanDividendPayout`
- `tbl_TrustPlanBonusConfig`
- `tbl_TrustPlanCommissionConfig`
- `tbl_TrustPlanCommissionOneOffTier`
- `tbl_TrustPlanCommissionRule`
- `tbl_TrustPlanBenefit`

Lookup/configuration tables:

- `tbl_Master_BankList`
- `tbl_Country`
- `tbl_Relationship`
- `tbl_Religion`
- `tbl_Role`
- `tbl_AgentRank`
- `tbl_TrustCategories`
- `tbl_Bank_Account_Type`
- `tbl_UnitTrust_Account_Type`
- `tbl_Type_Of_Identity`
- `tbl_Type_Of_Title`
- `tbl_Type_Of_Property`
- `tbl_Type_Of_Land`
- `tbl_Type_Of_Executor`
- `tbl_Type_Of_Asset_Allocation`
- `tbl_Type_Of_Payment_To_Trustee`
- `tbl_Config_General`
- `tbl_Config_Sms`

Audit and log tables:

- `tbl_ApiRequestLog`
- `tbl_log_action`
- `tbl_log_login`
- `tbl_log_error`
- `tbl_log_Registration`
- `tbl_log_ChangePassword`
- `tbl_log_SecurityAttemp`
- `tbl_log_securityPassAttemp`
- `tbl_log_TacAttemp`
- `tbl_log_SendMail`
- `tbl_log_sql`

## Frontend Wrapper Naming Guide

Use these wrapper modules or create them when missing:

- `src/api/authApi.ts` for `/auth/*` and account login/session behavior.
- `src/api/accountApi.ts` for `/account/*`.
- `src/api/registerApi.ts` for `/register/*`.
- `src/api/lookupApi.ts` for `/lookup/*`.
- `src/api/administratorApi.ts` for `/administrator/*`.
- `src/api/agentManagementApi.ts` for `/agent-management/*`.
- `src/api/networkApi.ts` for `/network/*`.
- `src/api/trustApplicationApi.ts` for `/trust-application/*`.
- `src/api/trustPlanApi.ts` for `/trust-plan/*`.
- `src/api/resourceApi.ts` for `/resource/*`.
- `src/api/auditApi.ts` for `/audit/*`.
- `src/api/configApi.ts` for `/config/*`.
- `src/api/serviceApi.ts` for `/service/*`.

When existing wrappers still point to mock or old endpoint names, update the
wrapper rather than changing page code to call real endpoints directly.

## Important Integration Notes

- Backend request property names are often PascalCase, for example `MerchantID`,
  `UserID`, `TrustID`, and `ProductCode`. Preserve those names unless a mapper
  is intentionally added in the wrapper.
- Query parameter casing matters because the backend action signatures use names
  such as `MerchantID`, `merchantId`, `trustId`, `userId`, and `productCode`.
- File uploads use multipart form-data and should not be sent through
  `withJsonContentType`.
- Registration KYC upload requires `X-Registration-Token`.
- Most protected endpoints infer current `UserID` and `MerchantID` from the JWT;
  do not send those values from the frontend unless the endpoint explicitly asks
  for them.
- `pageSize` is capped to 100 by several list endpoints.
- The legacy `API/Controller/ApiController.cs` contains older methods without
  route attributes. Since the active Web API config only maps attribute routes,
  treat the `v1` controllers as the reliable API surface unless backend routing
  is changed.
