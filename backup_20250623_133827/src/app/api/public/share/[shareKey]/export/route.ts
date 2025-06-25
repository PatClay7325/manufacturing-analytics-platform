import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import puppeteer from 'puppeteer';
import PDFDocument from 'pdfkit';

interface RouteParams {
  params: {
    shareKey: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { shareKey } = params;
    const body = await request.json();
    const { format = 'pdf' } = body;

    // Find public share
    const publicShare = await prisma.publicShare.findUnique({
      where: { shareKey },
      include: {
        Dashboard: true,
        Snapshot: true
      }
    });

    if (!publicShare) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      );
    }

    // Check if export is allowed
    if (!publicShare.allowExport) {
      return NextResponse.json(
        { error: 'Export is not allowed for this share' },
        { status: 403 }
      );
    }

    // Check if share is still valid
    if (!publicShare.isActive || 
        (publicShare.expiresAt && new Date(publicShare.expiresAt) < new Date()) ||
        (publicShare.maxViews && publicShare.viewCount >= publicShare.maxViews)) {
      return NextResponse.json(
        { error: 'Share link is no longer valid' },
        { status: 403 }
      );
    }

    switch (format.toLowerCase()) {
      case 'pdf':
        return await exportAsPDF(publicShare);
      
      case 'png':
        return await exportAsPNG(publicShare);
      
      case 'csv':
        return await exportAsCSV(publicShare);
      
      default:
        return NextResponse.json(
          { error: 'Unsupported export format' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Failed to export:', error);
    return NextResponse.json(
      { error: 'Failed to export dashboard' },
      { status: 500 }
    );
  }
}

async function exportAsPDF(publicShare: any): Promise<NextResponse> {
  try {
    // For full implementation, use puppeteer to render the dashboard
    // and convert to PDF. For now, create a simple PDF with dashboard info
    
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk) => chunks.push(chunk));
    
    // Add content
    doc.fontSize(20).text(publicShare.title, 50, 50);
    doc.fontSize(12).text(`Created: ${new Date(publicShare.createdAt).toLocaleString()}`, 50, 80);
    doc.fontSize(12).text(`Views: ${publicShare.viewCount}`, 50, 100);
    
    if (publicShare.Dashboard) {
      doc.fontSize(14).text('Dashboard Information', 50, 140);
      doc.fontSize(10).text(`ID: ${publicShare.Dashboard.id}`, 50, 160);
      doc.fontSize(10).text(`Title: ${publicShare.Dashboard.title}`, 50, 175);
      doc.fontSize(10).text(`Panels: ${publicShare.Dashboard.panels?.length || 0}`, 50, 190);
    }
    
    // Add a note about full export
    doc.fontSize(10).text(
      'Note: This is a simplified export. Full dashboard rendering requires additional setup.',
      50, 250
    );
    
    doc.end();
    
    // Wait for PDF generation to complete
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dashboard-${publicShare.dashboardId}-${Date.now()}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('PDF generation failed:', error);
    
    // Fallback to simple PDF
    const simplePDF = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(${publicShare.title}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000245 00000 n 
0000000333 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
415
%%EOF`);
    
    return new NextResponse(simplePDF, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="dashboard-${publicShare.dashboardId}-${Date.now()}.pdf"`
      }
    });
  }
}

async function exportAsPNG(publicShare: any): Promise<NextResponse> {
  try {
    // For full implementation, use puppeteer to capture screenshot
    // For now, return a placeholder image
    
    // 1x1 transparent PNG
    const placeholderPNG = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    
    return new NextResponse(placeholderPNG, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="dashboard-${publicShare.dashboardId}-${Date.now()}.png"`
      }
    });
    
  } catch (error) {
    console.error('PNG generation failed:', error);
    throw error;
  }
}

async function exportAsCSV(publicShare: any): Promise<NextResponse> {
  try {
    // Extract data from dashboard panels
    const csvRows: string[] = [];
    
    // Add headers
    csvRows.push('Panel,Metric,Value,Timestamp');
    
    // If we have snapshot data, use it
    if (publicShare.Snapshot?.data) {
      const data = publicShare.Snapshot.data as any;
      
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          csvRows.push(`"${item.panel || ''}","${item.metric || ''}","${item.value || ''}","${item.timestamp || ''}"`);
        });
      }
    } else {
      // Add sample data
      csvRows.push('"Sample Panel","Sample Metric","100","' + new Date().toISOString() + '"');
    }
    
    const csvContent = csvRows.join('\n');
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="dashboard-${publicShare.dashboardId}-${Date.now()}.csv"`
      }
    });
    
  } catch (error) {
    console.error('CSV generation failed:', error);
    throw error;
  }
}