import { connectDB } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const formData = await request
  } catch () {

  }
}

export async function GET(request: NextRequest) {

}