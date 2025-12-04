/**
 * CSS Module Type Declarations
 *
 * Allows TypeScript to recognize CSS imports
 */

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '@xterm/xterm/css/xterm.css' {
  const content: string;
  export default content;
}
