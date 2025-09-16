import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";


export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing required headers", { status: 400 });
  }

  const payload = await request.json();
  const body = JSON.stringify(payload);
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  
  } catch (err) {

    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    // Handle user created event
    try {
      const { email_addresses, primary_email_address_id } = evt.data;

      if (!email_addresses || email_addresses.length === 0) {
        return new Response("No email addresses found", { status: 400 });
      }

      const newUser = await prisma.user.create({
        data: {
          id: id!,
          email: email_addresses.find((email) => email.id === primary_email_address_id)?.email_address || email_addresses[0].email_address,
          isSubscribed: false,
        },
      });
      console.log("New user created:", newUser);
      return new Response("User created", { status: 200 });

    } catch (error) {
      console.error("Error creating user:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }

  return new Response("Event type not handled", { status: 200 });
}

