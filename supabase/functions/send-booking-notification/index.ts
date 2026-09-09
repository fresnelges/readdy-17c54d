import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const resend = new Resend(RESEND_API_KEY);

interface BookingPayload {
  to: string;
  type: "new_booking" | "cancelled";
  service_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_message: string;
  date: string;
  time: string;
  duration: number;
}

function formatDateFr(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const payload: BookingPayload = await req.json();

    if (!payload.to || !payload.service_name || !payload.customer_name || !payload.date || !payload.time) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    const dateFr = formatDateFr(payload.date);
    const subject =
      payload.type === "cancelled"
        ? `Annulation - ${payload.service_name} - ${payload.customer_name}`
        : `Nouveau RDV - ${payload.service_name} - ${dateFr} ${payload.time}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: ${payload.type === 'cancelled' ? '#ef4444' : '#10b981'}; padding: 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px;">
            ${payload.type === 'cancelled' ? 'Rendez-vous annulé' : 'Nouveau rendez-vous confirmé !'}
          </h2>
        </div>
        <div style="padding: 24px;">
          <h3 style="color: #111827; margin: 0 0 16px; font-size: 16px;">${payload.service_name}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Client</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; font-weight: 500; border-bottom: 1px solid #f3f4f6;">${payload.customer_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Email</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${payload.customer_email}</td>
            </tr>
            ${payload.customer_phone ? `<tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Téléphone</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${payload.customer_phone}</td>
            </tr>` : ""}
            <tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Date</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${dateFr}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Heure</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; font-weight: 600; border-bottom: 1px solid #f3f4f6;">${payload.time}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #6b7280; font-size: 13px; border-bottom: 1px solid #f3f4f6;">Durée</td>
              <td style="padding: 8px 12px; color: #111827; font-size: 13px; border-bottom: 1px solid #f3f4f6;">${payload.duration} minutes</td>
            </tr>
          </table>
          ${payload.customer_message ? `<div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;"><p style="color: #374151; font-size: 13px; margin: 0;"><strong>Message :</strong> ${payload.customer_message}</p></div>` : ""}
          <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">Email envoyé automatiquement par ZCalendar</p>
        </div>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: "ZCalendar <noreply@resend.dev>",
      to: [payload.to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});
