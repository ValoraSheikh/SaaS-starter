import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";


const ITEMS_PER_PAGE = 10;

export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";

  try {
    const todos = await prisma.todo.findMany({
      where: {
        userId,
        title: {
          contains: search,
          mode: "insensitive"
        }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE
    });

    const totalItems = await prisma.todo.count({
      where: {
        userId,
        title: {
          contains: search,
          mode: "insensitive"
        }
      }
    });

    return new Response(JSON.stringify({ todos, totalItems }), { status: 200 });

  } catch (error) {
    console.error("Error fetching todos:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

}


export async function POST(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({where : {id: userId}, include: {todos: true}})
  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  if (!user.isSubscribed && user.todos.length >= 5) {
    return new Response("Free tier limit reached. Please subscribe to add more todos.", { status: 403 });
  }

  const { title } = await request.json();

  const todo = await prisma.todo.create({
    data: {
      title: title.trim(),
      userId
    }
  });


  return new Response("Todo created", { status: 201 });
}
