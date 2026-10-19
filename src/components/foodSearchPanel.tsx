import { JSX, useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Text } from "./primitives/text";
import { IFoodRecent, INutrients } from "../models/foodLog";
import { IFoodProduct, OpenFoodFacts_isBarcode } from "../models/openFoodFacts";
import { FoodAddFlow_pickFromProduct, FoodAddFlow_pickFromRecent, IFoodPick } from "../models/foodAddFlow";
import { FoodApi_find } from "../utils/foodApi";
import { FoodTextInput } from "./foodUi";

interface IProps {
  recents: IFoodRecent[];
  savedFoods: IFoodProduct[];
  onPick: (pick: IFoodPick) => void;
  onQuickAdd: () => void;
  onLabel: () => void;
}

const searchDelayMs = 450;

function ResultRow(props: { title: string; subtitle: string; calories: string; onPress: () => void }): JSX.Element {
  return (
    <Pressable
      className="flex-row items-center py-3 border-b border-border-neutral"
      testID="food-result"
      data-testid="food-result"
      onPress={props.onPress}
    >
      <View className="flex-1 pr-2">
        <Text className="text-base" numberOfLines={1}>
          {props.title}
        </Text>
        {props.subtitle !== "" && (
          <Text className="text-xs text-text-secondary" numberOfLines={1}>
            {props.subtitle}
          </Text>
        )}
      </View>
      <Text className="text-sm text-text-secondary">{props.calories}</Text>
    </Pressable>
  );
}

function macrosLine(n: INutrients): string {
  return `${Math.round(n.protein)} P · ${Math.round(n.carbs)} C · ${Math.round(n.fat)} F`;
}

export function FoodSearchPanel(props: IProps): JSX.Element {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IFoodProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setIsLoading(false);
      setError(undefined);
      return undefined;
    }
    let isStale = false;
    setIsLoading(true);
    const timer = setTimeout(async () => {
      const result = await FoodApi_find(text, props.savedFoods);
      if (!isStale) {
        setIsLoading(false);
        setResults(result.ok ? result.value : []);
        setError(result.ok ? undefined : result.error);
      }
    }, searchDelayMs);
    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [query, props.savedFoods]);

  const showRecents = query.trim().length < 2;
  return (
    <View>
      <FoodTextInput
        testID="food-search-input"
        value={query}
        onChangeText={setQuery}
        placeholder="Search foods or type a barcode"
        autoFocus={true}
        autoCorrect={false}
        returnKeyType="search"
      />
      <Pressable className="py-3" onPress={props.onQuickAdd} testID="food-quick-add" data-testid="food-quick-add">
        <Text className="text-base text-text-link">+ Quick add calories and macros</Text>
      </Pressable>
      <Pressable className="pb-3" onPress={props.onLabel} testID="food-add-label" data-testid="food-add-label">
        <Text className="text-base text-text-link">+ Add a food from its nutrition label</Text>
      </Pressable>
      {isLoading && <ActivityIndicator className="py-4" />}
      {error != null && <Text className="py-3 text-sm text-text-error">{error}</Text>}
      {showRecents && props.recents.length > 0 && (
        <Text className="pt-2 text-xs font-semibold tracking-wide uppercase text-text-secondary">Recent</Text>
      )}
      {showRecents &&
        props.recents.map((r, i) => (
          <ResultRow
            key={`${r.name}-${i}`}
            title={r.name}
            subtitle={[r.brand, r.grams != null ? `${r.grams} g` : undefined, macrosLine(r.nutrients)]
              .filter(Boolean)
              .join(" · ")}
            calories={`${r.nutrients.calories} cal`}
            onPress={() => props.onPick(FoodAddFlow_pickFromRecent(r))}
          />
        ))}
      {!showRecents && !isLoading && error == null && results.length === 0 && (
        <Text className="py-3 text-sm text-text-secondary">No matches. Try other words, or use quick add.</Text>
      )}
      {!showRecents &&
        results.map((p, i) => (
          <ResultRow
            key={`${p.barcode ?? p.name}-${i}`}
            title={p.name}
            subtitle={[p.brand, `per 100 g: ${macrosLine(p.per100g)}`].filter(Boolean).join(" · ")}
            calories={`${Math.round(p.per100g.calories)} cal`}
            onPress={() =>
              props.onPick(FoodAddFlow_pickFromProduct(p, OpenFoodFacts_isBarcode(query.trim()) ? "barcode" : "search"))
            }
          />
        ))}
    </View>
  );
}
