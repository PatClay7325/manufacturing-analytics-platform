import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const dashboardId = params.id;
    const body = await request.json();
    const {
      title,
      description,
      config,
      data,
      isPublic = false,
      expiresAt,
      password,
      metadata
    } = body;

    // Validate required fields
    if (!title || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: title, config' },
        { status: 400 }
      );
    }

    // Generate unique share key
    const shareKey = nanoid(10);

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // TODO: Generate snapshot image (integrate with puppeteer or similar)
    // For now, we'll store the configuration and data
    const imageUrl = await generateSnapshotImage(dashboardId, config);

    const snapshot = await prisma.dashboardSnapshot.create({
      data: {
        dashboardId,
        title: title?.substring(0, 200) || '',
        description: description?.substring(0, 500) || '',
        config,
        data: data || null,
        imageUrl,
        userId: authResult.user.userId,
        isPublic,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        shareKey,
        password: hashedPassword,
        metadata: metadata || {}
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ snapshot }, { status: 201 });

  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to create snapshot' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'png';
    const includeData = searchParams.get('include_data') === 'true';
    const includeAnnotations = searchParams.get('include_annotations') === 'true';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // For public snapshots, we might not require authentication
    const isPublicRequest = searchParams.get('public') === 'true';
    
    if (!isPublicRequest) {
      const authResult = await requireAuth(request, 'view:dashboards');
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: authResult.error || 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const dashboardId = params.id;

    // Get the most recent snapshot or create a new one
    let snapshot = await prisma.dashboardSnapshot.findFirst({
      where: {
        dashboardId,
        ...(isPublicRequest ? { isPublic: true } : {}),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // If no snapshot exists, create one
    if (!snapshot && !isPublicRequest) {
      const authResult = await requireAuth(request);
      if (authResult.authenticated && authResult.user) {
        // Get dashboard configuration
        const dashboard = await prisma.dashboard.findUnique({
          where: { id: dashboardId }
        });

        if (dashboard) {
          snapshot = await prisma.dashboardSnapshot.create({
            data: {
              dashboardId,
              title: `Snapshot of ${dashboard.title}`,
              description: `Auto-generated snapshot`,
              config: dashboard.panels || {},
              userId: authResult.user.userId,
              isPublic: false
            },
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          });
        }
      }
    }

    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Handle different export formats
    switch (format.toLowerCase()) {
      case 'json':
        return NextResponse.json({
          snapshot: {
            ...snapshot,
            annotations: includeAnnotations ? await getAnnotations(dashboardId, from, to) : undefined
          }
        });

      case 'pdf':
        // TODO: Generate PDF from snapshot
        const pdfBuffer = await generatePDF(snapshot, includeData, includeAnnotations, from, to);
        return new NextResponse(pdfBuffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="dashboard-${dashboardId}-${Date.now()}.pdf"`
          }
        });

      case 'png':
      default:
        // Return the image URL or generate image
        if (snapshot.imageUrl) {
          // Redirect to the image or serve it directly
          return NextResponse.redirect(snapshot.imageUrl);
        } else {
          // Generate image on-the-fly
          const imageBuffer = await generateImage(snapshot, includeData, includeAnnotations, from, to);
          return new NextResponse(imageBuffer, {
            headers: {
              'Content-Type': 'image/png',
              'Content-Disposition': `attachment; filename="dashboard-${dashboardId}-${Date.now()}.png"`
            }
          });
        }
    }

  } catch (error) {
    console.error('Failed to get snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to get snapshot' },
      { status: 500 }
    );
  }
}

async function generateSnapshotImage(dashboardId: string, config: any): Promise<string | null> {
  try {
    // TODO: Implement image generation using puppeteer
    // This would involve:
    // 1. Launch headless browser
    // 2. Navigate to dashboard URL
    // 3. Wait for charts to load
    // 4. Take screenshot
    // 5. Upload to storage service or save locally
    // 6. Return image URL
    
    // For now, return null (image will be generated on-demand)
    return null;
  } catch (error) {
    console.error('Failed to generate snapshot image:', error);
    return null;
  }
}

async function getAnnotations(dashboardId: string, from?: string | null, to?: string | null) {
  const where: any = { dashboardId };
  
  if (from && to) {
    where.time = {
      gte: new Date(from),
      lte: new Date(to)
    };
  }

  return prisma.annotation.findMany({
    where,
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      time: 'asc'
    }
  });
}

async function generatePDF(
  snapshot: any, 
  includeData: boolean, 
  includeAnnotations: boolean, 
  from?: string | null, 
  to?: string | null
): Promise<Buffer> {
  // TODO: Implement PDF generation
  // This could use puppeteer to generate PDF from HTML
  // or a library like PDFKit to create custom PDF layouts
  
  // For now, return a simple placeholder
  const placeholderPDF = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Dashboard Snapshot - ${snapshot.title}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000205 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`);

  return placeholderPDF;
}

async function generateImage(
  snapshot: any, 
  includeData: boolean, 
  includeAnnotations: boolean, 
  from?: string | null, 
  to?: string | null
): Promise<Buffer> {
  // TODO: Implement image generation
  // This would typically use puppeteer or similar to capture dashboard as image
  
  // For now, return a simple placeholder image (1x1 PNG)
  const placeholderPNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );

  return placeholderPNG;
}