import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, nonce, signature, quote } = body;

    // 验证参数
    if (!address || !nonce || !signature || quote === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: address, nonce, signature, quote" },
        { status: 400 }
      );
    }

    // 验证地址格式
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid address format" },
        { status: 400 }
      );
    }

    // 构建签名消息
    const message = `Update my quote on Captain Clench\n\nQuote: ${quote}\nNonce: ${nonce}`;

    // 验证签名
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 保存或更新 quote
    const result = await prisma.quote.upsert({
      where: { address: address.toLowerCase() },
      update: { quote },
      create: { address: address.toLowerCase(), quote },
    });

    return NextResponse.json({
      success: true,
      data: {
        address: result.address,
        quote: result.quote,
      },
    });
  } catch (error) {
    console.error("Error updating quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
