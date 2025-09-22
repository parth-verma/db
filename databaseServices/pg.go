package databaseServices

import (
	"database/sql"
	"fmt"
	"log/slog"
)
import "changeme/utils"

type PGService struct {
	connections utils.DBConnection
	logger      *slog.Logger
}

func (pg *PGService) GetConnection(connection utils.DBConnection) (error, *sql.DB) {
	if connection.Type != "postgres" {
		return fmt.Errorf("unsupported database type: %s", connection.Type), nil
	}
	if connection.SSLMode == nil || *connection.SSLMode == "prefer" {
		pg.logger.Info("Trying to connect with sslmode=disable")
		connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			connection.Host, connection.Port, connection.Username, connection.Password, connection.Database)
		db, err := sql.Open("postgres", connStr)
		if err != nil {
			return err, nil
		}

		err = db.Ping()
		if err != nil {
			pg.logger.Info("Trying to connect with sslmode=require")
			connStr = fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
				connection.Host, connection.Port, connection.Username, connection.Password, connection.Database)
			db, err = sql.Open("postgres", connStr)
			if err != nil {
				return err, nil
			}
			err = db.Ping()
			if err != nil {
				return err, nil
			}
			return nil, db
		} else {
			return nil, db
		}
	}

	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		connection.Host, connection.Port, connection.Username, connection.Password, connection.Database, *connection.SSLMode)
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return err, nil
	}
	err = db.Ping()
	if err != nil {
		return err, nil
	}
	return nil, db
}

func CreatePGService(logger *slog.Logger) *PGService {
	if logger == nil {
		return &PGService{
			logger: slog.Default(),
		}
	}
	return &PGService{
		logger: logger,
	}
}
