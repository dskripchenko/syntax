package main

import (
	"fmt"
	"strings"
)

// Shape is anything with an area.
type Shape interface {
	Area() float64
}

type Rect struct{ W, H float64 }

func (r Rect) Area() float64 { return r.W * r.H }

func main() {
	shapes := []Shape{Rect{2, 3}, Rect{W: 1.5, H: 4}}
	raw := `a raw string with "quotes" and \n`
	for i, s := range shapes {
		fmt.Printf("%d: %.2f\n", i, s.Area())
	}
	var r rune = 'λ'
	fmt.Println(strings.ToUpper(raw), r, nil == nil, iota)
}
