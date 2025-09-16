import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const todoId = parseInt(params.id);

    const todo = await prisma.todo.findUnique({ where: { id: todoId } });
    if (!todo || todo.userId !== userId) {
      return new Response("Not Found", { status: 404 });
    }

    if (todo.userId !== userId) {
      return new Response("Forbidden", { status: 403 });
    }

    await prisma.todo.delete({ where: { id: todoId } });
    return new Response("Deleted", { status: 200 });


  } catch (error) {
    console.error("Error deleting todo:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}