import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { getLandGrabTemplate } from "./pdfTemplateHelper";

/**
 * Land Grab Engine: Generates a 6x8 grid PDF worksheet in LANDSCAPE.
 */
export const generateLandGrabPDF = async (topic, questions) => {
    console.log('[LandGrabEngine] Starting HTML-to-PDF generation...');

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.innerHTML = getLandGrabTemplate(topic, questions);
    document.body.appendChild(container);

    try {
        const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        // 'l' for landscape orientation
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgWidth = pdfWidth;
        const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`${topic}_땅따먹기.pdf`);
        console.log('[LandGrabEngine] PDF generated successfully.');
    } catch (err) {
        console.error('[LandGrabEngine] Error:', err);
        throw err;
    } finally {
        document.body.removeChild(container);
    }
};
