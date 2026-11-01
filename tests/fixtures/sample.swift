import Foundation

struct Point: Equatable {
    var x: Double
    var y: Double

    func distance(to other: Point) -> Double {
        let dx = other.x - x, dy = other.y - y
        return (dx * dx + dy * dy).squareRoot()
    }
}

let message = """
    Points: \(Point(x: 0, y: 0))
    """
guard let value = Optional(42) else { fatalError("no value") }
print(message, value, nil == nil)
