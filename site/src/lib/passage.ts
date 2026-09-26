// A normal anchor remains useful in readers without text-fragment support.
export function passageLink(base: string, text: string, anchor = 'main'): string {
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  const encode = (value: string) => encodeURIComponent(value).replace(/-/g, '%2D');
  const fragment = words.length > 24
    ? `${encode(words.slice(0, 12).join(' '))},${encode(words.slice(-12).join(' '))}`
    : encode(words.join(' '));
  const url = new URL(base);
  url.hash = `${encodeURIComponent(anchor)}:~:text=${fragment}`;
  return url.href;
}
