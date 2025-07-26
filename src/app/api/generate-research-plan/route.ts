import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const traceData = await request.json();
    
    // 这里调用你的实际 API 接口
    // 替换为你的实际接口地址
    const response = await fetch('http://116.62.16.12:8000/agent/generate-research-plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(traceData),
    });

    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating research plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate research plan' },
      { status: 500 }
    );
  }
}