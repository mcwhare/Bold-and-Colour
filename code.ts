// Show the UI (the modal popup)
figma.showUI(__html__, { width: 260, height: 140 });

// Helper function to convert Hex to Figma's RGB format (0 to 1 scale)
function hexToRgb(hex: string) {
  // Remove hash if present
  hex = hex.replace(/^#/, '');
  // Convert 3-digit hex to 6-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  return { r, g, b };
}

// Helper to check if a font style implies "Bold"
function isBold(fontName: FontName | typeof figma.mixed): boolean {
  if (fontName === figma.mixed) return false;
  
  const style = fontName.style.toLowerCase();
  // Catch common bold weights in font styles
  return style.includes('bold') || style.includes('black') || style.includes('heavy') || style.includes('700') || style.includes('800') || style.includes('900');
}

// Helper to check if a fill color is white (#FFFFFF)
function isWhite(fills: any): boolean {
  if (fills === figma.mixed || !fills || fills.length === 0) return false;
  
  const fill = fills[0];
  if (fill.type === 'SOLID') {
    // Check if R, G, and B are all 1 (which means white in Figma)
    return fill.color.r === 1 && fill.color.g === 1 && fill.color.b === 1;
  }
  return false;
}

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'apply-color') {
    const selection = figma.currentPage.selection;
    
    // Filter the selection to only get Text Nodes
    const textNodes = selection.filter(node => node.type === 'TEXT') as TextNode[];

    if (textNodes.length === 0) {
      figma.notify("Please select at least one text box.");
      return;
    }

    const newRgbColor = hexToRgb(msg.color);
    let modifiedCount = 0;

    for (const node of textNodes) {
      // Figma requires fonts to be loaded before editing text properties
      const fonts = node.getRangeAllFontNames(0, node.characters.length);
      for (const font of fonts) {
        await figma.loadFontAsync(font);
      }

      // Check character by character so we don't accidentally override mixed styles
      for (let i = 0; i < node.characters.length; i++) {
        const fontName = node.getRangeFontName(i, i + 1);
        const fills = node.getRangeFills(i, i + 1);

        if (isBold(fontName) && isWhite(fills)) {
          // Apply the new color
          node.setRangeFills(i, i + 1, [{ type: 'SOLID', color: newRgbColor }]);
          modifiedCount++;
        }
      }
    }

    if (modifiedCount > 0) {
      figma.notify(`Successfully updated colors!`);
    } else {
      figma.notify("No white & bold text found in the selection.");
    }
    
    // Close the plugin once finished
    figma.closePlugin();
  }
};