using API_CPX.Context;
using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;

namespace API_CPX.Class.Model
{
    public class RelationshipAsync : Base
    {
        private IEnumerable<RelationshipList> relationshipLists;

        public IEnumerable<RelationshipList> RelationshipLists
        {
            get { return relationshipLists; }
            set { relationshipLists = value; }
        }

        public async Task<bool> GetRelationshipList(string MerchantID)
        {
            using (var dbR = new Sandbox_BasedEntities())
            {
                Status = 0;

                var relationships = await dbR.tbl_Relationship
                    .Where(a => a.Status == 0)
                    .OrderBy(a => a.Sort)
                    .Select(a => new RelationshipList
                    {
                        RelationshipCode = a.Relationship_Code,
                        RelationshipName = a.Relationship_Name
                    })
                    .ToListAsync();

                RelationshipLists = relationships.OrderBy(a => a.RelationshipName).ToList();

                Message = "Success";
                return true;
            }
        }

        public class RelationshipList
        {
            public string RelationshipCode { get; set; }
            public string RelationshipName { get; set; }
        }
    }
}