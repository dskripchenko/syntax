//! A small parser: lifetimes, raw strings, macros, attributes.
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct Token<'a> {
    pub text: &'a str,
    pub kind: Kind,
}

/* block /* nested */ comment */
impl<'a> Token<'a> {
    pub fn new(text: &'a str) -> Self {
        let quote = '"';
        let escaped = '\n';
        let raw = r#"a "raw" string"#;
        let bytes = b"bytes";
        println!("{} {} {:?} {:?}", quote, escaped, raw, bytes);
        Self { text, kind: Kind::Word }
    }
}

fn count(words: &[&str]) -> HashMap<String, usize> {
    let mut map = HashMap::new();
    for w in words.iter() {
        *map.entry(w.to_string()).or_insert(0usize) += 1;
    }
    map
}
