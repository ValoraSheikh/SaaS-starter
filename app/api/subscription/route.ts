import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";


export async function POST() {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({where : {id: userId}})
    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const subscriptionEnds = new Date();
    subscriptionEnds.setMonth(subscriptionEnds.getMonth() + 1);

    await prisma.user.update({
      where: { id: userId },
      data: { 
        isSubscribed: true,
        subscriptionEnds: subscriptionEnds
      }
    });

    return new Response("Subscription updated", { status: 200 });

  } catch (error) {
    console.error("Error updating subscription:", error);
    return new Response("Internal Server Error", { status: 500 });
  }


}

export async function GET() {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where : {id: userId},
      select: { isSubscribed: true, subscriptionEnds: true }
    });

    if (!user) {
      return new Response("User not found", { status: 404 });
    }

    const now = new Date();
    if (user.subscriptionEnds && user.subscriptionEnds < now) {
      await prisma.user.update({
        where: { id: userId },
        data: { isSubscribed: false, subscriptionEnds: null }
      });

    }

    return new Response(JSON.stringify({ isSubscribed: user.isSubscribed, subscriptionEnds: user.subscriptionEnds }), { status: 200 });

  } catch (error) {
    console.error("Error fetching subscription:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}