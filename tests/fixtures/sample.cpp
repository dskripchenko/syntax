#include <vector>
#include <string>

namespace shop {
template <typename T>
class Cart {
public:
    void add(const T& item) { items_.push_back(item); }
    [[nodiscard]] std::size_t size() const noexcept { return items_.size(); }
private:
    std::vector<T> items_;
};
}  // namespace shop

int main() {
    auto raw = R"json({"a": "b"})json";
    shop::Cart<std::string> cart;
    cart.add("tea");
    return cart.size() > 0 && raw != nullptr ? 0 : 1;
}
