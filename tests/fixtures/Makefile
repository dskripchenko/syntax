# Build tasks
SRC := $(wildcard src/*.c)
CFLAGS ?= -O2 -Wall

.PHONY: all clean
all: app

app: $(SRC)
	$(CC) $(CFLAGS) -o $@ $^

clean:
	rm -f app
