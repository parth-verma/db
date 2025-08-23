package main

import (
	"database/sql"
	"fmt"
	_ "github.com/lib/pq"
	"time"
)

type PGService struct{}

const (
	host     = "192.168.64.2"
	port     = 5432
	user     = "sakila"
	password = "p_ssW0rd"
	dbname   = "sakila"
)

type columns struct {
	Name string
	Type string
}

func (p *PGService) RunSQLQuery(query string) (error, *[]columns, *[][]string) {
	startTime := time.Now()
	defer func() {
		fmt.Printf("Sql query took %v\n", time.Since(startTime))
	}()
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		return err, nil, nil
	}

	rows, err := db.Query(query)
	if err != nil {
		return err, nil, nil
	}
	defer rows.Close()
	// log column types

	cols, err := rows.Columns()
	colTypes, err := rows.ColumnTypes()
	if err != nil {
		return err, nil, nil
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
			return err, nil, nil
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
		return err, nil, nil
	}

	return nil, &types, &data
}
