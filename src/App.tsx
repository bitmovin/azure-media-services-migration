import {ColorScheme, ColorSchemeProvider, MantineProvider} from '@mantine/core';
import {useColorScheme} from '@mantine/hooks';
import {ModalsProvider} from '@mantine/modals';
import {useState} from 'react';

import {Migration} from './Migration';

export default function App() {
  const preferredColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(preferredColorScheme);
  const toggleColorScheme = (value?: ColorScheme) =>
    setColorScheme(value || (colorScheme === 'dark' ? 'light' : 'dark'));

  return (
    <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
      <MantineProvider withGlobalStyles withNormalizeCSS theme={{colorScheme}}>
        <ModalsProvider>
          <Migration />
        </ModalsProvider>
      </MantineProvider>
    </ColorSchemeProvider>
  );
}
