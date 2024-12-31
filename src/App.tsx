import React, { useState } from 'react';
import { MantineProvider, Container, Title } from '@mantine/core';
import { CSVConverterTB } from './components/CSVConverterTB';
import '@mantine/core/styles.css';

function App() {
  return (
    <MantineProvider>
      <Container size="lg" py="xl">
        <Title order={1} mb="xl" ta="center">CSV to MySQL Converter</Title>
        <CSVConverterTB />
      </Container>
    </MantineProvider>
  );
}

export default App;