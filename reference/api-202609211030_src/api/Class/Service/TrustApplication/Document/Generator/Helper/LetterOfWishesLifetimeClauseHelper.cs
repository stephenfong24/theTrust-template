using System;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator.Helper
{
    public static class LetterOfWishesLifetimeClauseHelper
    {
        public static string BuildDuringMyLifetimeClause(
            bool hasCaretakerDistribution,
            string caretakerName,
            string caretakerIdentityNo,
            string substituteCaretakerName,
            string substituteCaretakerIdentityNo)
        {
            if (!hasCaretakerDistribution)
            {
                return
                    "In the event I become total permanent disabled or " +
                    "I have been diagnosed to be in the state of comatose, " +
                    "insanity or unsound mind, it is my wish that the Trustee " +
                    "shall utilize the Trust Fund to pay for my maintenance, " +
                    "medical/hospitalisation, caretaker’s allowances, " +
                    "household expenses and other personal needs, whether " +
                    "I am residing in Malaysia or abroad. Such distributions " +
                    "shall be made upon the submission of relevant " +
                    "supporting documents to the Trustee.";
            }

            if (string.IsNullOrWhiteSpace(caretakerName) ||
                string.IsNullOrWhiteSpace(caretakerIdentityNo))
            {
                throw new InvalidOperationException(
                    "Main caretaker details are required when caretaker distribution is enabled.");
            }

            string clause =
                "In the event I become total permanent disabled or " +
                "I have been diagnosed to be in the state of comatose, " +
                "insanity or unsound mind, it is my wish that the Trustee " +
                "shall distribute to my caretaker, " +
                caretakerName.Trim() + " " +
                caretakerIdentityNo.Trim() +
                ", to take care of my maintenance, " +
                "medical/hospitalisation, household expenses " +
                "and other personal needs.";

            if (!string.IsNullOrWhiteSpace(substituteCaretakerName))
            {
                if (string.IsNullOrWhiteSpace(substituteCaretakerIdentityNo))
                {
                    throw new InvalidOperationException(
                        "Substitute caretaker identity number is required.");
                }

                clause +=
                    " In the event that my aforesaid caretaker " +
                    "passed away or refused to act as my caretaker, " +
                    "the Trustee shall distribute the Trust Fund " +
                    "to my substitute caretaker, " +
                    substituteCaretakerName.Trim() + " " +
                    substituteCaretakerIdentityNo.Trim() +
                    ", for the same purpose.";
            }

            clause +=
                " Such distributions shall be made upon the " +
                "submission of relevant supporting documents " +
                "to the Trustee.";

            return clause;
        }
    }
}