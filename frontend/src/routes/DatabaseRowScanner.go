	// Get column information
	cols, err := rows.Columns()
	if err != nil {
		return err, nil, nil
	}
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
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
			return err, nil, nil
		}

		row := make([]string, len(cols))
		for i, val := range values {
			switch v := val.(type) {
			case nil:
				row[i] = "NULL"

			// Most drivers return []byte for TEXT/VARCHAR when scanning into interface{}
			case []byte:
				row[i] = string(v)

			// Common concrete types
			case string:
				row[i] = v
			case bool:
				if v {
					row[i] = "true"
				} else {
					row[i] = "false"
				}
			case int64:
				row[i] = strconv.FormatInt(v, 10)
			case float64:
				row[i] = strconv.FormatFloat(v, 'f', -1, 64)
			case time.Time:
				row[i] = v.Format(time.RFC3339Nano)

			// Handle sql.Null* if a driver returns them
			case sql.NullString:
				if v.Valid {
					row[i] = v.String
				} else {
					row[i] = "NULL"
				}
			case sql.NullInt64:
				if v.Valid {
					row[i] = strconv.FormatInt(v.Int64, 10)
				} else {
					row[i] = "NULL"
				}
			case sql.NullFloat64:
				if v.Valid {
					row[i] = strconv.FormatFloat(v.Float64, 'f', -1, 64)
				} else {
					row[i] = "NULL"
				}
			case sql.NullBool:
				if v.Valid {
					row[i] = strconv.FormatBool(v.Bool)
				} else {
					row[i] = "NULL"
				}
			case sql.NullTime:
				if v.Valid {
					row[i] = v.Time.Format(time.RFC3339Nano)
				} else {
					row[i] = "NULL"
				}

			// Fallback
			default:
				// Also handle pointers just in case
				switch pv := val.(type) {
				case *string:
					if pv != nil {
						row[i] = *pv
					} else {
						row[i] = "NULL"
					}
				case *int64:
					if pv != nil {
						row[i] = strconv.FormatInt(*pv, 10)
					} else {
						row[i] = "NULL"
					}
				case *float64:
					if pv != nil {
						row[i] = strconv.FormatFloat(*pv, 'f', -1, 64)
					} else {
						row[i] = "NULL"
					}
				case *time.Time:
					if pv != nil {
						row[i] = pv.Format(time.RFC3339Nano)
					} else {
						row[i] = "NULL"
					}
				default:
					row[i] = fmt.Sprint(val)
				}
			}
		}

		data = append(data, row)
	}
