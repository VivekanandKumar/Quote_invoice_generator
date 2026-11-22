/// <reference types="vite/client" />

declare module 'handlebars/dist/handlebars.js' {
  import Handlebars from 'handlebars';
  export default Handlebars;
}

declare module '*.hbs?raw' {
  const content: string;
  export default content;
}

declare module '*.hbs' {
  const content: string;
  export default content;
}
