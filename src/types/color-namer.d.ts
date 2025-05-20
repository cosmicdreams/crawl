declare module 'color-namer' {
  interface ColorName {
    name: string;
    hex: string;
    distance: number;
  }

  interface ColorNameResult {
    ntc: ColorName[];
    basic: ColorName[];
    html: ColorName[];
    pantone: ColorName[];
    roygbiv: ColorName[];
  }

  function colorNamer(color: string): ColorNameResult;
  
  export = colorNamer;
}
