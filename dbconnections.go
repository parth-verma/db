package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
)

// DBConnection represents a database connection configuration
type DBConnection struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "postgres" or "mysql"
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
	Database string `json:"database"`
}

// DBConnectionService handles database connection operations
type DBConnectionService struct {
	connectionsFile string
	connections     []DBConnection
}

// NewDBConnectionService creates a new DBConnectionService
func NewDBConnectionService() *DBConnectionService {
	// Get the user's home directory
	homeDir, err := os.UserHomeDir()
	if err != nil {
		homeDir = "."
	}

	// Create a directory for the application if it doesn't exist
	appDir := filepath.Join(homeDir, ".dbapp")
	if _, err := os.Stat(appDir); os.IsNotExist(err) {
		os.Mkdir(appDir, 0755)
	}

	// Path to the connections file
	connectionsFile := filepath.Join(appDir, "connections.json")

	// Create a new service
	service := &DBConnectionService{
		connectionsFile: connectionsFile,
	}

	// Load existing connections
	service.loadConnections()

	return service
}

// loadConnections loads connections from the file
func (s *DBConnectionService) loadConnections() {
	// Check if the file exists
	if _, err := os.Stat(s.connectionsFile); os.IsNotExist(err) {
		// Create an empty file
		s.connections = []DBConnection{}
		s.saveConnections()
		return
	}

	// Read the file
	data, err := ioutil.ReadFile(s.connectionsFile)
	if err != nil {
		s.connections = []DBConnection{}
		return
	}

	// Parse the JSON
	err = json.Unmarshal(data, &s.connections)
	if err != nil {
		s.connections = []DBConnection{}
	}
}

// saveConnections saves connections to the file
func (s *DBConnectionService) saveConnections() error {
	// Convert to JSON
	data, err := json.MarshalIndent(s.connections, "", "  ")
	if err != nil {
		return err
	}

	// Write to file
	return ioutil.WriteFile(s.connectionsFile, data, 0644)
}

// GetConnections returns all saved connections
func (s *DBConnectionService) GetConnections() []DBConnection {
	return s.connections
}

// SaveConnection adds or updates a connection
func (s *DBConnectionService) SaveConnection(connection DBConnection) error {
	// Check if the connection already exists
	for i, conn := range s.connections {
		if conn.ID == connection.ID {
			// Update existing connection
			s.connections[i] = connection
			return s.saveConnections()
		}
	}

	// Add new connection
	s.connections = append(s.connections, connection)
	return s.saveConnections()
}

// DeleteConnection removes a connection
func (s *DBConnectionService) DeleteConnection(id string) error {
	for i, conn := range s.connections {
		if conn.ID == id {
			// Remove the connection
			s.connections = append(s.connections[:i], s.connections[i+1:]...)
			return s.saveConnections()
		}
	}
	return fmt.Errorf("connection not found")
}

// TestConnection tests if a connection works
func (s *DBConnectionService) TestConnection(connection DBConnection) error {
	var db *sql.DB
	var err error

	switch connection.Type {
	case "postgres":
		connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			connection.Host, connection.Port, connection.Username, connection.Password, connection.Database)
		db, err = sql.Open("postgres", connStr)
	case "mysql":
		connStr := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
			connection.Username, connection.Password, connection.Host, connection.Port, connection.Database)
		db, err = sql.Open("mysql", connStr)
	default:
		return fmt.Errorf("unsupported database type: %s", connection.Type)
	}

	if err != nil {
		return err
	}
	defer db.Close()

	// Test the connection
	err = db.Ping()
	if err != nil {
		return err
	}

	return nil
}

// RunQuery executes a query on the specified connection
func (s *DBConnectionService) RunQuery(connectionID string, query string) ([]columns, [][]string, error) {
	// Find the connection
	var connection DBConnection
	found := false
	for _, conn := range s.connections {
		if conn.ID == connectionID {
			connection = conn
			found = true
			break
		}
	}

	if !found {
		return nil, nil, fmt.Errorf("connection not found")
	}

	// Connect to the database
	var db *sql.DB
	var err error

	switch connection.Type {
	case "postgres":
		connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			connection.Host, connection.Port, connection.Username, connection.Password, connection.Database)
		db, err = sql.Open("postgres", connStr)
	case "mysql":
		connStr := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s",
			connection.Username, connection.Password, connection.Host, connection.Port, connection.Database)
		db, err = sql.Open("mysql", connStr)
	default:
		return nil, nil, fmt.Errorf("unsupported database type: %s", connection.Type)
	}

	if err != nil {
		return nil, nil, err
	}
	defer db.Close()

	// Execute the query
	rows, err := db.Query(query)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	// Get column information
	cols, err := rows.Columns()
	colTypes, err := rows.ColumnTypes()
	if err != nil {
		return nil, nil, err
	}

	types := make([]columns, len(cols))
	for i, col := range cols {
		types[i] = columns{
			Name: col,
			Type: colTypes[i].DatabaseTypeName(),
		}
	}

	// Initialize data as a slice to hold rows of data
	data := make([][]string, 0)

	// Prepare a slice to hold a single row's values
	values := make([]interface{}, len(cols))
	valuePtrs := make([]interface{}, len(cols))

	// Scan rows
	for rows.Next() {
		// Initialize pointers to each item in the values slice
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		// Scan the row into the valuePtrs
		if err := rows.Scan(valuePtrs...); err != nil {
			return nil, nil, err
		}

		// Convert each value to string and add to the row
		row := make([]string, len(cols))
		for i, v := range values {
			// Convert interface{} to string
			if v == nil {
				row[i] = "NULL"
			} else {
				row[i] = fmt.Sprintf("%v", v)
			}
		}

		// Add the row to the data
		data = append(data, row)
	}

	// Check for errors from iterating over rows
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}

	return types, data, nil
}
