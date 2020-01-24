const colorsDark = {
  background: 'black',
  foreground: 'white',
  gray: 'rgb(152,152,157)',
  yellow: 'rgb(255,214,10)',
  green: 'rgb(48,209,88)',
  red: 'rgb(255,69,58)',
  purple: 'rgb(191,90,242)',
};

const colorsLight = {
  background: 'white',
  foreground: 'black',
  gray: 'rgb(142,142,147)',
  yellow: 'rgb(255,204,0)',
  green: 'rgb(52,199,89)',
  red: 'rgb(255,59,48)',
  purple: 'rgb(175,82,222)',
};

const system = (name: keyof typeof colorsDark, colorScheme?: string) => {
  return colorScheme === 'dark' ? colorsDark[name] : colorsLight[name];
};

export default {
  theme: 'rgba(102,8,116,1)',
  lightTheme: 'rgba(102,8,116,0.6)',
  // background: '#f0f0f0',
  // placeholder: '#eeeeee',
  system,
};
