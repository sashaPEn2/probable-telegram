export const withSafeColorsForHtml2Canvas = async (certificateRefCurrent: HTMLElement, callback: () => Promise<void>) => {
    const parseComponent = (val: string, isPercent: boolean): number => {
      if (!val || val.toLowerCase() === 'none') return 0;
      if (val.endsWith('%')) {
        return parseFloat(val) / 100;
      }
      const parsed = parseFloat(val);
      return isPercent ? parsed / 100 : parsed;
    };

    const oklabToRgb = (L: number, a: number, b: number, alpha: number = 1): string => {
      const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

      const l = Math.pow(Math.max(0, l_), 3);
      const m = Math.pow(Math.max(0, m_), 3);
      const s = Math.pow(Math.max(0, s_), 3);

      const rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
      const gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
      const bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

      const rFinal = rLinear <= 0.0031308 ? 12.92 * rLinear : 1.055 * Math.pow(rLinear, 1 / 2.4) - 0.055;
      const gFinal = gLinear <= 0.0031308 ? 12.92 * gLinear : 1.055 * Math.pow(gLinear, 1 / 2.4) - 0.055;
      const bFinal = bLinear <= 0.0031308 ? 12.92 * bLinear : 1.055 * Math.pow(bLinear, 1 / 2.4) - 0.055;

      const r255 = Math.min(255, Math.max(0, Math.round(rFinal * 255)));
      const g255 = Math.min(255, Math.max(0, Math.round(gFinal * 255)));
      const b255 = Math.min(255, Math.max(0, Math.round(bFinal * 255)));

      if (alpha === 1) {
        return `rgb(${r255}, ${g255}, ${b255})`;
      } else {
        return `rgba(${r255}, ${g255}, ${b255}, ${alpha})`;
      }
    };

    const oklchToRgb = (l: number, c: number, h: number, a: number = 1): string => {
      const hRad = (h * Math.PI) / 180;
      const oklabL = l;
      const oklabA = c * Math.cos(hRad);
      const oklabB = c * Math.sin(hRad);
      return oklabToRgb(oklabL, oklabA, oklabB, a);
    };

    const translateOklColor = (cssString: string): string => {
      if (!cssString || typeof cssString !== 'string') return cssString;
      if (!cssString.toLowerCase().includes('okl')) return cssString;

      return cssString.replace(/(oklch|oklab)\([^)]+\)/gi, (match, type, content) => {
        try {
          const parts = content.trim().split(/[\s,\/]+/).filter(Boolean);
          if (parts.length < 3) return match;

          const l = parseComponent(parts[0], false);
          const c = parseComponent(parts[1], false);
          
          let hVal = parts[2];
          let h = 0;
          if (hVal && hVal.toLowerCase() !== 'none') {
            if (hVal.endsWith('deg')) {
              h = parseFloat(hVal);
            } else if (hVal.endsWith('rad')) {
              h = (parseFloat(hVal) * 180) / Math.PI;
            } else if (hVal.endsWith('turn')) {
              h = parseFloat(hVal) * 360;
            } else if (hVal.endsWith('%')) {
              h = (parseFloat(hVal) / 100) * 360;
            } else {
              h = parseFloat(hVal);
            }
          }

          let alpha = 1;
          if (parts.length >= 4) {
            alpha = parseComponent(parts[3], true);
          }

          if (type.toLowerCase() === 'oklch') {
            return oklchToRgb(l, c, h, alpha);
          } else {
            return oklabToRgb(l, c, h, alpha);
          }
        } catch (e) {
          console.warn("Failed parsing okl color", match, e);
          return match;
        }
      });
    };

    // Robust character-by-character replacement function to handle nested parentheses like oklch(var(--...) ...)
    const sanitizeColors = (cssText: string): string => {
      if (!cssText.toLowerCase().includes('okl')) {
        return cssText;
      }
      let result = '';
      let i = 0;
      const len = cssText.length;
      
      while (i < len) {
        const nextO = cssText.indexOf('o', i);
        const nextCapO = cssText.indexOf('O', i);
        let nextIndex = -1;
        if (nextO !== -1 && nextCapO !== -1) {
          nextIndex = Math.min(nextO, nextCapO);
        } else {
          nextIndex = nextO !== -1 ? nextO : nextCapO;
        }
        
        if (nextIndex === -1) {
          result += cssText.slice(i);
          break;
        }
        
        result += cssText.slice(i, nextIndex);
        i = nextIndex;
        
        const remaining = cssText.slice(i);
        const matchOklch = remaining.match(/^oklch\(/i);
        const matchOklab = remaining.match(/^oklab\(/i);
        
        if (matchOklch || matchOklab) {
          const matchStr = matchOklch ? matchOklch[0] : matchOklab![0];
          let parenCount = 1;
          let j = i + matchStr.length;
          while (j < len && parenCount > 0) {
            if (cssText[j] === '(') {
              parenCount++;
            } else if (cssText[j] === ')') {
              parenCount--;
            }
            j++;
          }
          result += 'rgb(100, 100, 100)';
          i = j;
        } else {
          result += cssText[i];
          i++;
        }
      }
      return result;
    };

    // Intercept window.getComputedStyle so that html2canvas is passed fully translated rgb/rgba values
    const originalGetComputedStyle = window.getComputedStyle;
    const styleCache = new WeakMap<CSSStyleDeclaration, any>();

    window.getComputedStyle = function(el: Element, pseudoElt?: string | null): CSSStyleDeclaration {
      const style = originalGetComputedStyle(el, pseudoElt);
      if (styleCache.has(style)) {
        return styleCache.get(style);
      }

      const proxy = new Proxy(style, {
        get(target, prop) {
          if (typeof prop === 'string') {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                return typeof val === 'string' ? translateOklColor(val) : val;
              };
            }
            
            const val = (target as any)[prop];
            if (typeof val === 'string') {
              return translateOklColor(val);
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
          return Reflect.get(target, prop);
        }
      });

      styleCache.set(style, proxy);
      return proxy as CSSStyleDeclaration;
    };

    const originalStyles = new Map<HTMLStyleElement, string>();
    const styleElements = Array.from(document.querySelectorAll('style'));
    
    for (const styleEl of styleElements) {
      originalStyles.set(styleEl, styleEl.innerHTML);
      const rewritten = sanitizeColors(styleEl.innerHTML);
      styleEl.innerHTML = rewritten;
    }

    // Also sanitize inline style attributes of elements
    const originalInlineStyles = new Map<HTMLElement, string>();
    if (certificateRefCurrent) {
      const element = certificateRefCurrent;
      const elementsWithStyle = Array.from(element.querySelectorAll('*')).concat(element) as HTMLElement[];
      for (const el of elementsWithStyle) {
        const styleAttr = el.getAttribute('style');
        if (styleAttr && (styleAttr.toLowerCase().includes('oklch') || styleAttr.toLowerCase().includes('oklab'))) {
          originalInlineStyles.set(el, styleAttr);
          el.setAttribute('style', sanitizeColors(styleAttr));
        }
      }
    }

    const disabledLinks: HTMLLinkElement[] = [];
    const linkElements = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    
    for (const linkEl of linkElements) {
      try {
        if (linkEl.href.indexOf(window.location.origin) === 0) {
          const response = await fetch(linkEl.href);
          if (response.ok) {
            let cssText = await response.text();
            cssText = sanitizeColors(cssText);
            
            const tempStyle = document.createElement('style');
            tempStyle.id = 'html2canvas-temp-style';
            tempStyle.innerHTML = cssText;
            document.head.appendChild(tempStyle);
            
            linkEl.disabled = true;
            disabledLinks.push(linkEl);
          }
        } else {
          linkEl.disabled = true;
          disabledLinks.push(linkEl);
        }
      } catch (e) {
        console.warn('Could not rewrite external stylesheet:', linkEl.href, e);
        linkEl.disabled = true;
        disabledLinks.push(linkEl);
      }
    }

    try {
      await callback();
    } finally {
      // Restore getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
      
      // Restore original styles
      for (const [styleEl, originalHTML] of originalStyles.entries()) {
        styleEl.innerHTML = originalHTML;
      }
      // Restore inline style attributes
      for (const [el, originalInline] of originalInlineStyles.entries()) {
        el.setAttribute('style', originalInline);
      }
      // Re-enable links
      for (const linkEl of disabledLinks) {
        linkEl.disabled = false;
      }
      // Remove temporary style elements
      const tempStyles = document.querySelectorAll('#html2canvas-temp-style');
      tempStyles.forEach(el => el.remove());
    }
  };
