import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { attemptId } = await req.json();

    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: { test: true },
    });

    if (!attempt) return NextResponse.json({ error: "Attempt not found" }, { status: 404 });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Full Report for ${attempt.test.title}`,
              description: "Deep dive into your personality profile with AI-generated insights.",
            },
            unit_amount: 300, // $3.00
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/report/${attemptId}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/r/${attemptId}`,
      metadata: {
        attemptId,
      },
    });

    // Create a pending purchase record
    await prisma.purchase.create({
      data: {
        attemptId,
        stripeSessionId: session.id,
        status: "pending",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe session creation failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

