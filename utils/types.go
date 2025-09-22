package utils

type DBConnection struct {
	ID       string  `json:"id"`
	Name     string  `json:"name"`
	Type     string  `json:"type"` // "postgres" or "mysql"
	Host     string  `json:"host"`
	Port     int     `json:"port"`
	Username string  `json:"username"`
	Password string  `json:"password"`
	Database string  `json:"database"`
	SSLMode  *string `json:"sslmode"`
}

type Columns struct {
	Name string
	Type string
}
