import { BRAND } from '../../brand';

export const UI_FONT_FAMILY = 'Vazirmatn, Tahoma, Arial, sans-serif';

export async function loadUiFont(): Promise<void> {
    try {
        // Canvas text does not automatically redraw after a web font loads.
        // Load the Persian face before Phaser measures or paints any labels.
        await document.fonts.load(
            '400 16px Vazirmatn',
            `${BRAND.persianName} ${BRAND.name} ۰۱۲۳۴۵۶۷۸۹`,
        );
    } catch (error) {
        console.warn('Vazirmatn could not be loaded; using the system font fallback.', error);
    }
}
