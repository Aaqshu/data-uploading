import React, { useState } from 'react';
import { parse } from 'papaparse';
import {
  Box,
  Button,
  Table,
  TextInput,
  Select,
  Stack,
  Group,
  Text,
  Paper,
  Alert,
  Progress,
  ScrollArea,
} from '@mantine/core';
import { IconUpload, IconDatabase, IconTable, IconCheck, IconX } from '@tabler/icons-react';

type MySQLFieldType = 'VARCHAR(255)' | 'INT' | 'DECIMAL(10,2)' | 'DATE' | 'TEXT' | 'BOOLEAN';

interface ColumnMapping {
  csvColumn: string;
  mysqlField: string;
  mysqlType: MySQLFieldType;
}

interface MySQLCredentials {
  host: string;
  user: string;
  password: string;
  port: Number;
  database: string;
}

const API_BASE_URL = 'http://localhost:3001';

export function CSVConverter() {
  const [csvData, setCSVData] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [mysqlCredentials, setMysqlCredentials] = useState<MySQLCredentials>({
    host: 'l7cup2om0gngra77.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
    user: 'j0epu8qs2yd1diiv',
    password: 'v20ugo7k0s1geuyl',
    port: 3306,
    database: 'q4fe2j2q17g8mwgv'
  });
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parse(file, {
        complete: (results) => {
          setCSVData(results.data as string[][]);
          if (results.data.length > 0) {
            const headers = results.data[0] as string[];
            setColumnMappings(
              headers.map((header) => ({
                csvColumn: header,
                mysqlField: header.toLowerCase().replace(/\s+/g, '_'),
                mysqlType: 'VARCHAR(255)',
              }))
            );
          }
        },
      });
    }
  };

  const handleMySQLCredentialsChange = (field: keyof MySQLCredentials) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMysqlCredentials((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleColumnMappingChange = (
    index: number,
    field: 'mysqlField' | 'mysqlType',
    value: string
  ) => {
    setColumnMappings((prev) =>
      prev.map((mapping, i) =>
        i === index
          ? { ...mapping, [field]: value }
          : mapping
      )
    );
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mysqlCredentials),
      });
      
      const data = await response.json();
      if (data.success) {
        setConnectionStatus('success');
      } else {
        throw new Error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      setError(error.message || 'Failed to connect to the server');
    }
  };

  const generateCreateTableSQL = () => {
    const tableName = `${mysqlCredentials.database}.csv_import`;
    const columns = columnMappings
      .map((mapping) => `${mapping.mysqlField} ${mapping.mysqlType}`)
      .join(',\n  ');
    return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns}\n);`;
  };

  const handleImportData = async () => {
    setProgress(0);
    setError(null);

    try {
      // Create table
      const createTableResponse = await fetch(`${API_BASE_URL}/api/create-table`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: mysqlCredentials,
          sql: generateCreateTableSQL(),
        }),
      });

      if (!createTableResponse.ok) {
        throw new Error('Failed to create table');
      }

      // Prepare data for insertion
      const headers = columnMappings.map(m => m.mysqlField);
      const rows = csvData.slice(1); // Skip header row
      const totalRows = rows.length;

      // Insert data
      const insertResponse = await fetch(`${API_BASE_URL}/api/insert-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: mysqlCredentials,
          tableName: 'csv_import',
          columns: headers,
          data: rows,
        }),
      });

      if (!insertResponse.ok) {
        throw new Error('Failed to insert data');
      }

      setProgress(100);
    } catch (error: any) {
      setError(error.message || 'Failed to import data');
      setProgress(0);
    }
  };

  return (
    <Stack spacing="xl">
      {error && (
        <Alert color="red" title="Error" variant="filled">
          {error}
        </Alert>
      )}

      {/* File Upload */}
      <Paper p="md" withBorder>
        <Group>
          <Button component="label" leftSection={<IconUpload size={14} />}>
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </Button>
          <Text size="sm">
            {csvData.length > 0
              ? `${csvData.length - 1} rows loaded`
              : 'No file selected'}
          </Text>
        </Group>
      </Paper>

      {/* Data Preview */}
      {csvData.length > 0 && (
        <Paper p="md" withBorder>
          <Title order={3} mb="md">Data Preview</Title>
          <ScrollArea h={300}>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  {csvData[0].map((header, index) => (
                    <Table.Th key={index}>{header}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {csvData.slice(1, 6).map((row, rowIndex) => (
                  <Table.Tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <Table.Td key={cellIndex}>{cell}</Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      )}

      {/* Column Mappings */}
      {columnMappings.length > 0 && (
        <Paper p="md" withBorder>
          <Title order={3} mb="md">Column Mappings</Title>
          <Stack>
            {columnMappings.map((mapping, index) => (
              <Group key={index} grow>
                <Text size="sm">{mapping.csvColumn}</Text>
                <TextInput
                  placeholder="MySQL Field Name"
                  value={mapping.mysqlField}
                  onChange={(e) =>
                    handleColumnMappingChange(index, 'mysqlField', e.target.value)
                  }
                />
                <Select
                  data={[
                    'VARCHAR(255)',
                    'INT',
                    'DECIMAL(10,2)',
                    'DATE',
                    'TEXT',
                    'BOOLEAN',
                  ]}
                  value={mapping.mysqlType}
                  onChange={(value) =>
                    handleColumnMappingChange(index, 'mysqlType', value || 'VARCHAR(255)')
                  }
                />
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* MySQL Connection */}
      <Paper p="md" withBorder>
        <Title order={3} mb="md">MySQL Connection</Title>
        <Stack>
          <TextInput
            label="Host"
            placeholder="localhost"
            value={mysqlCredentials.host}
            onChange={handleMySQLCredentialsChange('host')}
          />
          <TextInput
            label="User"
            placeholder="root"
            value={mysqlCredentials.user}
            onChange={handleMySQLCredentialsChange('user')}
          />
          <TextInput
            label="Password"
            type="password"
            value={mysqlCredentials.password}
            onChange={handleMySQLCredentialsChange('password')}
          />
          <TextInput
            label="Database"
            placeholder="mydatabase"
            value={mysqlCredentials.database}
            onChange={handleMySQLCredentialsChange('database')}
          />
          <Group>
            <Button
              onClick={testConnection}
              loading={connectionStatus === 'testing'}
              leftSection={<IconDatabase size={14} />}
            >
              Test Connection
            </Button>
            {connectionStatus === 'success' && (
              <Alert icon={<IconCheck size={16} />} color="green" variant="light">
                Connection successful!
              </Alert>
            )}
            {connectionStatus === 'error' && (
              <Alert icon={<IconX size={16} />} color="red" variant="light">
                Connection failed!
              </Alert>
            )}
          </Group>
        </Stack>
      </Paper>

      {/* SQL Preview and Execution */}
      {connectionStatus === 'success' && (
        <Paper p="md" withBorder>
          <Title order={3} mb="md">SQL Preview</Title>
          <Box
            p="xs"
            style={{
              backgroundColor: 'var(--mantine-color-gray-0)',
              borderRadius: 'var(--mantine-radius-sm)',
              fontFamily: 'monospace',
            }}
          >
            <pre>{generateCreateTableSQL()}</pre>
          </Box>
          <Group mt="md">
            <Button
              onClick={handleImportData}
              leftSection={<IconTable size={14} />}
              loading={progress > 0 && progress < 100}
            >
              Create Table & Import Data
            </Button>
          </Group>
          {progress > 0 && (
            <Box mt="md">
              <Progress value={progress} mb="xs" />
              <Text size="sm" c="dimmed">
                {progress === 100 ? 'Import complete!' : `Importing data... ${Math.round(progress)}%`}
              </Text>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );
}

interface TitleProps {
  order: number;
  children: React.ReactNode;
  mb?: string;
}

function Title({ order, children, mb }: TitleProps) {
  const Tag = `h${order}` as keyof JSX.IntrinsicElements;
  return (
    <Tag style={{ marginBottom: mb, fontWeight: 'bold' }}>
      {children}
    </Tag>
  );
}