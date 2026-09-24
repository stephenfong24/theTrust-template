using API_CPX.Class.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;

namespace API_CPX.Class.Service.TrustApplication.Document.Generator
{
    public class TrustDocumentGeneratorResolver
    {
        private const string Code = "TRUST-DOCUMENT-GENERATOR";

        private readonly List<ITrustDocumentGenerator> _generators;

        public TrustDocumentGeneratorResolver()
        {
            _generators =
                new List<ITrustDocumentGenerator>
                {
                    new BookingFormDocumentGenerator()

                    // Future:
                    //
                    // new KycFormDocumentGenerator(),
                    // new TrustDeedDocumentGenerator(),
                    // new CertificateDocumentGenerator()
                };
        }

        public ITrustDocumentGenerator Resolve(string documentCode)
        {
            var generator = _generators.FirstOrDefault(x => x.CanHandle(documentCode));

            if (generator == null)
            {
                throw new BusinessException("Unsupported document generator: " + documentCode, Code);
            }
            return generator;
        }
    }
}