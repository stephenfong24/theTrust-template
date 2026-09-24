using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace API_CPX.Class.Model.Class
{
    public class NotificationDto
    {
        public string NotificationId { get; set; }

        public long UserId { get; set; }

        public string Category { get; set; }
        // SYSTEM
        // COURSE
        // CERTIFICATE
        // PAYMENT
        // ANNOUNCEMENT

        public string EventType { get; set; }
        // CERTIFICATE_READY
        // CERTIFICATE_FAILED
        // PAYMENT_SUCCESS
        // COURSE_COMPLETED

        public string Title { get; set; }

        public string Message { get; set; }

        public string Url { get; set; }

        public string Icon { get; set; }

        public DateTime CreatedAt { get; set; }

        public object Data { get; set; }
    }
}