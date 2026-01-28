import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    // 验证参数
    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: "Missing required field: addresses (array)" },
        { status: 400 }
      );
    }

    // 限制查询数量
    if (addresses.length > 100) {
      return NextResponse.json(
        { error: "Too many addresses, max 100" },
        { status: 400 }
      );
    }

    // 转换为小写
    const normalizedAddresses = addresses.map((addr: string) => addr.toLowerCase());

    // 批量查询
    const quotes = await prisma.quote.findMany({
      where: {
        address: {
          in: normalizedAddresses,
        },
      },
      select: {
        address: true,
        quote: true,
      },
    });

    // 构建 address -> quote 的映射
    const quoteMap: Record<string, string> = {};
    for (const q of quotes) {
      quoteMap[q.address] = q.quote;
    }

    return NextResponse.json({
      success: true,
      data: quoteMap,
    });
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
