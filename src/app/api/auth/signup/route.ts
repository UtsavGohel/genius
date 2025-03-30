import { connectToDatabase } from "@/app/api/db";
import User from "@/app/model/User";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  const { name, email, password } = await req.json();

  await connectToDatabase();

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    return NextResponse.json({ error: "User Already Exist" }, { status: 400 });
  }

  const hashPwd = await bcrypt.hash(password, 10);

  const newUser = new User({ name, email, password: hashPwd });
  const user = await newUser.save();

  if (!user) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: "User registered successfully", user: newUser },
    { status: 201 }
  );
}
