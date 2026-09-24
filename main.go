package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"

	_ "github.com/lib/pq"
)

var db *sql.DB

type Material struct {
	ID      int     `json:"id"`
	Name    string  `json:"name"`
	Unit    string  `json:"unit"`
	Norm    float64 `json:"norm"`
	Balance float64 `json:"balance"`
}

type Act struct {
	ID           int     `json:"id"`
	MaterialID   int     `json:"material_id"`
	MaterialName string  `json:"material_name"`
	Qty          float64 `json:"qty"`
	Unit         string  `json:"unit"`
	Reason       string  `json:"reason"`
	CreatedAt    string  `json:"created_at"`
}

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "host=127.0.0.1 port=5432 user=postgres password=rewers2323 dbname=workshoptrack sslmode=disable"
	}

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	if err = db.Ping(); err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	http.HandleFunc("/api/materials", MaterialsHandler)
	http.HandleFunc("/api/materials/", MaterialByIDHandler)
	http.HandleFunc("/api/acts", ActsHandler)
	http.HandleFunc("/api/acts/last", UndoLastActHandler)
	http.HandleFunc("/api/register", RegisterHandler)
	http.HandleFunc("/api/login", LoginHandler)

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	log.Println("Сервер запущен: http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func MaterialsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	switch r.Method {
	case "GET":
		rows, err := db.Query(`SELECT id, name, unit, norm, balance FROM materials ORDER BY id`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		list := []Material{}
		for rows.Next() {
			var m Material
			rows.Scan(&m.ID, &m.Name, &m.Unit, &m.Norm, &m.Balance)
			list = append(list, m)
		}
		json.NewEncoder(w).Encode(list)

	case "POST":
		var m Material
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		err := db.QueryRow(
			`INSERT INTO materials (name, unit, norm, balance) VALUES ($1, $2, $3, 0) RETURNING id`,
			m.Name, m.Unit, m.Norm,
		).Scan(&m.ID)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		json.NewEncoder(w).Encode(m)

	default:
		http.Error(w, "Method not allowed", 405)
	}
}

func MaterialByIDHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/materials/"), "/")
	id, _ := strconv.Atoi(parts[0])
	if id == 0 {
		http.Error(w, "Invalid ID", 400)
		return
	}

	switch r.Method {
	case "PUT":
		var m Material
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		_, err := db.Exec(
			`UPDATE materials SET name = $1, unit = $2, norm = $3 WHERE id = $4`,
			m.Name, m.Unit, m.Norm, id,
		)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Write([]byte(`{"ok":true}`))

	case "DELETE":
		_, err := db.Exec(`DELETE FROM materials WHERE id = $1`, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Write([]byte(`{"ok":true}`))

	case "POST":
		if len(parts) < 2 || parts[1] != "stock" {
			http.Error(w, "Not found", 404)
			return
		}
		var body struct {
			Qty float64 `json:"qty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}
		_, err := db.Exec(`UPDATE materials SET balance = balance + $1 WHERE id = $2`, body.Qty, id)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		w.Write([]byte(`{"ok":true}`))

	default:
		http.Error(w, "Method not allowed", 405)
	}
}

func ActsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	switch r.Method {
	case "GET":
		rows, err := db.Query(`
			SELECT a.id, a.material_id, m.name, a.qty, m.unit, COALESCE(a.reason, ''), a.created_at
			FROM acts a
			JOIN materials m ON m.id = a.material_id
			ORDER BY a.id DESC
		`)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()

		list := []Act{}
		for rows.Next() {
			var a Act
			var createdAt string
			rows.Scan(&a.ID, &a.MaterialID, &a.MaterialName, &a.Qty, &a.Unit, &a.Reason, &createdAt)
			a.CreatedAt = createdAt
			list = append(list, a)
		}
		json.NewEncoder(w).Encode(list)

	case "POST":
		var body struct {
			MaterialID int     `json:"material_id"`
			Qty        float64 `json:"qty"`
			Reason     string  `json:"reason"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), 400)
			return
		}

		var balance float64
		err := db.QueryRow(`SELECT balance FROM materials WHERE id = $1`, body.MaterialID).Scan(&balance)
		if err != nil {
			http.Error(w, "Материал не найден", 404)
			return
		}
		if balance < body.Qty {
			http.Error(w, "Недостаточно остатка", 400)
			return
		}

		tx, _ := db.Begin()
		tx.Exec(`UPDATE materials SET balance = balance - $1 WHERE id = $2`, body.Qty, body.MaterialID)
		tx.Exec(`INSERT INTO acts (material_id, qty, reason) VALUES ($1, $2, $3)`, body.MaterialID, body.Qty, body.Reason)
		tx.Commit()

		w.Write([]byte(`{"ok":true}`))

	default:
		http.Error(w, "Method not allowed", 405)
	}
}

func UndoLastActHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	if r.Method != "DELETE" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var id, materialID int
	var qty float64
	err := db.QueryRow(`SELECT id, material_id, qty FROM acts ORDER BY id DESC LIMIT 1`).
		Scan(&id, &materialID, &qty)
	if err != nil {
		http.Error(w, "Нет актов для отмены", 404)
		return
	}

	tx, _ := db.Begin()
	tx.Exec(`UPDATE materials SET balance = balance + $1 WHERE id = $2`, qty, materialID)
	tx.Exec(`DELETE FROM acts WHERE id = $1`, id)
	tx.Commit()

	w.Write([]byte(`{"ok":true}`))
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	if body.Username == "" || body.Email == "" || len(body.Password) < 4 {
		http.Error(w, "Некорректные данные", 400)
		return
	}

	var id int
	err := db.QueryRow(
		`INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id`,
		body.Username, body.Email, body.Password,
	).Scan(&id)
	if err != nil {
		http.Error(w, "Логин или email уже заняты", 400)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       id,
		"username": body.Username,
		"email":    body.Email,
	})
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", 405)
		return
	}

	var body struct {
		Login    string `json:"login"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}

	var id int
	var username, email string
	err := db.QueryRow(
		`SELECT id, username, email FROM users WHERE (username = $1 OR email = $1) AND password = $2`,
		body.Login, body.Password,
	).Scan(&id, &username, &email)
	if err != nil {
		http.Error(w, "Неверный логин или пароль", 401)
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       id,
		"username": username,
		"email":    email,
	})
}
