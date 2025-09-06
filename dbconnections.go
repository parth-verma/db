package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strconv"
	"time"

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

// TableInfo represents a database table
type TableInfo struct {
	Name string `json:"name"`
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
			// Preserve existing password if not provided in update
			if connection.Password == "" {
				connection.Password = conn.Password
			}
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

func convertToString(val interface{}) string {
	switch v := val.(type) {
	case nil:
		return "NULL"

	// Most drivers return []byte for TEXT/VARCHAR when scanning into interface{}
	case []byte:
		return string(v)

	// Common concrete types
	case string:
		return v
	case bool:
		if v {
			return "true"
		} else {
			return "false"
		}
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case time.Time:
		return v.Format(time.RFC3339Nano)

	// Handle sql.Null* if a driver returns them
	case sql.NullString:
		if v.Valid {
			return v.String
		} else {
			return "NULL"
		}
	case sql.NullInt64:
		if v.Valid {
			return strconv.FormatInt(v.Int64, 10)
		} else {
			return "NULL"
		}
	case sql.NullFloat64:
		if v.Valid {
			return strconv.FormatFloat(v.Float64, 'f', -1, 64)
		} else {
			return "NULL"
		}
	case sql.NullBool:
		if v.Valid {
			return strconv.FormatBool(v.Bool)
		} else {
			return "NULL"
		}
	case sql.NullTime:
		if v.Valid {
			return v.Time.Format(time.RFC3339Nano)
		} else {
			return "NULL"
		}

		// Fallback
	default:
		// Also handle pointers just in case
		switch pv := val.(type) {
		case *string:
			if pv != nil {
				return *pv
			} else {
				return "NULL"
			}
		case *int64:
			if pv != nil {
				return strconv.FormatInt(*pv, 10)
			} else {
				return "NULL"
			}
		case *float64:
			if pv != nil {
				return strconv.FormatFloat(*pv, 'f', -1, 64)
			} else {
				return "NULL"
			}
		case *time.Time:
			if pv != nil {
				return pv.Format(time.RFC3339Nano)
			} else {
				return "NULL"
			}
		default:
			return fmt.Sprint(val)
		}
	}

}

// RunQuery executes a query on the specified connection
func (s *DBConnectionService) RunQuery(connectionID string, query string) (error, []columns, [][]string) {
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
		return fmt.Errorf("connection not found"), nil, nil
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
		return fmt.Errorf("unsupported database type: %s", connection.Type), nil, nil
	}

	if err != nil {
		return err, nil, nil
	}
	defer db.Close()

	// Execute the query
	rows, err := db.Query(query)
	if err != nil {
		return err, nil, nil
	}
	defer rows.Close()

	var types []columns
	var data [][]string

	for {
		// Get column information for the current result set
		cols, err := rows.Columns()
		if err != nil {
			return err, nil, nil
		}
		colTypes, err := rows.ColumnTypes()
		if err != nil {
			return err, nil, nil
		}

		// Prepare columns metadata for this result set
		types = make([]columns, len(cols))
		for i, col := range cols {
			types[i] = columns{
				Name: col,
				Type: colTypes[i].DatabaseTypeName(),
			}
		}

		// Initialize data for this result set (overwrite to keep only last set)
		data = make([][]string, 0)

		// Prepare a slice to hold a single row's values
		values := make([]interface{}, len(cols))
		valuePtrs := make([]interface{}, len(cols))

		// Scan rows in the current result set
		for rows.Next() {
			// Initialize pointers to each item in the values slice
			for i := range values {
				valuePtrs[i] = &values[i]
			}

			// Scan the row into the valuePtrs
			if err := rows.Scan(valuePtrs...); err != nil {
				return err, nil, nil
			}

			// Convert each value to string and add to the row
			row := make([]string, len(cols))
			for i, v := range values {
				if v == nil {
					row[i] = "NULL"
				} else {
					row[i] = convertToString(v)
				}
			}

			// Add the row to the data for this result set
			data = append(data, row)
		}

		// Check for errors from iterating over rows in this result set
		if err := rows.Err(); err != nil {
			return err, nil, nil
		}

		// Move to the next result set if available; if not, break and return the last processed set
		if rows.NextResultSet() {
			// continue to process the next result set
			continue
		}
		break
	}

	return nil, types, data
}
